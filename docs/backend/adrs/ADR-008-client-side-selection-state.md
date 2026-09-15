# ADR-008: Client-Side Selection State with Debounced Auto-Save

**Status:** Accepted  
**Date:** 2026-09-15  
**Deciders:** Architecture Team, Frontend Team, Backend Team  
**Technical Story:** Gallery — Customer Photo Selection UX  

---

## Context

Fitur seleksi foto menangani gallery dengan jumlah foto yang besar (100 hingga 1000+ foto).

- Customer akan **toggle** foto (pilih/batalkan) dalam jumlah besar sebelum submit.
- Proses toggle harus **terasa instan** — tanpa loading spinner atau network delay per klik.
- Customer mungkin menutup browser di tengah proses dan melanjutkan di kemudian hari.
- Spesifikasi VPS terbatas (2vCPU/2GB RAM) — beban server per interaksi individual harus ditekan.
- Database PostgreSQL adalah source of truth untuk selection yang sudah disimpan.

---

## Decision Drivers

| Driver | Penjelasan |
| :--- | :--- |
| **UX & Responsiveness** | Toggle foto harus instan. Delay akibat network request per klik tidak dapat diterima. |
| **Session Resilience** | Customer harus bisa melanjutkan pilihan jika browser ditutup/crash. |
| **Server Load** | Minimalisir write I/O ke PostgreSQL dan beban request ke NestJS. |
| **Statelessness** | Server tetap stateless di antara toggle individual — tidak menyimpan session di memory. |

---

## Considered Options

| Option | Pros | Cons |
| :--- | :--- | :--- |
| **A: Server-side per-click** (tiap toggle = 1 HTTP request) | Data selalu sinkron antara client dan DB | UI lag per klik; traffic sangat tinggi; tidak cocok untuk gallery 1000+ foto di VPS 2vCPU |
| **B: Client-side state + debounced auto-save *(CHOSEN)*** | UX instan; beban server rendah (di-batch); mendukung resume via session token | Potensi kehilangan max 1.5 detik state terakhir jika browser crash sebelum debounce sempat terpanggil |
| **C: Client-side only, save only on submit** | Paling hemat server call | Seluruh state hilang jika customer tidak sengaja reload atau browser crash sebelum submit |

---

## Decision

**Pilih Option B: Client-side state + debounced auto-save.**

Pendekatan ini menyeimbangkan UX instan dengan persistensi data yang aman:

1. **Client-Side Store:** Selection state dikelola di React store (Zustand atau `useState`) — toggle hanya mengubah local state, tidak ada network call.
2. **Instant UI:** UI re-render segera setelah klik, counter selection update real-time di client.
3. **Debounced Sync (1.5 detik):** Setelah klik terakhir, tunggu 1.5 detik, lalu kirim full replacement array ke `PUT /g/:token/selections/:sessionToken`.
4. **Session Resume:** `sessionToken` disimpan di `localStorage` dengan key `gallery_session_{galleryToken}`. Saat customer kembali, fetch `GET /g/:token/selections/:sessionToken` untuk restore state.

---

## Implementation Details

### State Shape

```typescript
interface GallerySelectionState {
  selectedIds: Set<string>;          // Set of photo UUIDs
  isSubmitted: boolean;              // Lock UI setelah submit
  sessionToken: string | null;       // Dari localStorage atau API response
  customerName: string;
}
```

### Zustand Store

```typescript
import { create } from 'zustand';

interface SelectionStore {
  selectedIds: Set<string>;
  isSubmitted: boolean;
  togglePhoto: (id: string) => void;
  setInitial: (ids: string[]) => void;
  markSubmitted: () => void;
}

const useSelectionStore = create<SelectionStore>((set) => ({
  selectedIds: new Set(),
  isSubmitted: false,

  togglePhoto: (id) =>
    set((state) => {
      const newSet = new Set(state.selectedIds);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return { selectedIds: newSet };
    }),

  setInitial: (ids) => set({ selectedIds: new Set(ids) }),
  markSubmitted: () => set({ isSubmitted: true }),
}));
```

### Debounced Auto-Save Hook

```typescript
// hooks/useDebouncedSync.ts
import { useEffect, useRef } from 'react';

export function useDebouncedSync(
  selectedIds: Set<string>,
  galleryToken: string,
  sessionToken: string | null,
  delayMs = 1500,
) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!sessionToken) return;

    // Clear previous timer
    if (timerRef.current) clearTimeout(timerRef.current);

    // Set new debounced timer
    timerRef.current = setTimeout(async () => {
      try {
        await fetch(`/api/v1/g/${galleryToken}/selections/${sessionToken}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ photoIds: Array.from(selectedIds) }),
        });
      } catch (err) {
        // Show warning toast — retry akan terjadi di toggle berikutnya
        console.warn('Auto-save failed:', err);
      }
    }, delayMs);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [selectedIds, galleryToken, sessionToken, delayMs]);
}
```

### Session Resume on Mount

```typescript
// hooks/useSessionRestore.ts
export function useSessionRestore(galleryToken: string) {
  const setInitial = useSelectionStore((s) => s.setInitial);
  const [sessionToken, setSessionToken] = useState<string | null>(null);

  useEffect(() => {
    const storageKey = `gallery_session_${galleryToken}`;
    const storedToken = localStorage.getItem(storageKey);

    if (storedToken) {
      // Try to restore existing session
      fetch(`/api/v1/g/${galleryToken}/selections/${storedToken}`)
        .then((res) => {
          if (!res.ok) throw new Error('Session not found');
          return res.json();
        })
        .then((data) => {
          setInitial(data.data.selectedPhotoIds);
          setSessionToken(storedToken);
          toast.info('Melanjutkan sesi sebelumnya');
        })
        .catch(() => {
          // Session expired/invalid — start fresh
          localStorage.removeItem(storageKey);
          setSessionToken(null);
        });
    }
  }, [galleryToken]);

  const saveSessionToken = (token: string) => {
    localStorage.setItem(`gallery_session_${galleryToken}`, token);
    setSessionToken(token);
  };

  return { sessionToken, saveSessionToken };
}
```

### Submit Handler

```typescript
const handleSubmit = async () => {
  try {
    const response = await fetch(
      `/api/v1/g/${galleryToken}/selections/${sessionToken}/submit`,
      { method: 'POST' }
    );
    if (!response.ok) throw new Error('Submit failed');
    const data = await response.json();
    markSubmitted(); // Lock UI
    toast.success(`Pilihan berhasil dikirim! ${data.data.message}`);
  } catch (err) {
    toast.error('Gagal submit. Silakan coba lagi.');
  }
};
```

---

## Consequences

| Tipe | Detail |
| :--- | :--- |
| ✅ Positive | Toggle foto terasa instan (zero network latency), counter update real-time di client |
| ✅ Positive | Beban VPS sangat rendah — write ke DB hanya terjadi setiap 1.5 detik idle |
| ✅ Positive | Session resume memungkinkan customer melanjutkan kapan saja |
| ⚠️ Negative | Potensi kehilangan state terakhir maksimal 1.5 detik jika browser crash tiba-tiba (dapat ditolerir) |
| 📌 Note | Selection counter pada UI adalah client-side count (size of Set), bukan DB aggregate query |

---

## Related ADRs

- **[ADR-007](./ADR-007-google-drive-public-source.md)** — Drive parser berjalan di background. Customer membaca `thumbnailUrl` dan `viewUrl` dari DB, bukan langsung dari Drive.
- **[ADR-003](./ADR-003-caching-queue.md)** — Redis/BullMQ digunakan untuk sync queue, **bukan** untuk menyimpan session state customer. PostgreSQL adalah source of truth untuk `selectedPhotoIds`.

---

## References

- [Zustand Documentation](https://docs.pmnd.rs/zustand/getting-started/introduction)
- [useDebounce pattern (usehooks-ts)](https://usehooks-ts.com/react-hook/use-debounce)
- Pattern serupa digunakan oleh Google Docs (offline-first, batch sync)
