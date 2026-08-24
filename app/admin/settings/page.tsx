'use client';

import React, { useState } from 'react';
import {
  MessageSquare,
  Mail,
  Building2,
  QrCode,
  CheckCircle2,
  RefreshCw,
  Send,
  Save,
  Copy,
  Smartphone,
  Server,
  Key,
  Globe,
  Sliders,
  Sparkles,
  Info,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { toast } from 'sonner';

export default function AdminSettingsPage() {
  const [activeTab, setActiveTab] = useState('whatsapp');

  // WhatsApp Baileys State
  const [waEndpoint, setWaEndpoint] = useState('http://localhost:8000/api/wa-baileys');
  const [waApiKey, setWaApiKey] = useState('kaya_sec_live_98a72b14f5e6');
  const [waSenderPhone, setWaSenderPhone] = useState('+62 858-7654-3210');
  const [waConnected, setWaConnected] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [testPhoneNumber, setTestPhoneNumber] = useState('081234567890');

  // Template message state
  const [selectedTemplate, setSelectedTemplate] = useState<'NEW_BOOKING' | 'PAYMENT_VERIFIED' | 'REMINDER_H1' | 'PHOTO_DELIVERY'>('PAYMENT_VERIFIED');

  const [templates, setTemplates] = useState({
    NEW_BOOKING: `Halo Kak *{customer_name}*! 👋\n\nTerima kasih telah memesan photoshoot wisuda bersama *Kayastory Photography* 🎓✨\n\n📋 *Rincian Booking:*\n• Kode: *{booking_code}*\n• Paket: *{package_name}*\n• Tanggal: *{session_date}*\n• Jam: *{session_time} WIB*\n• Lokasi: *{location}*\n• Total Tagihan: *{total_price}*\n\n💳 *Instruksi DP (50%):*\nSilakan transfer ke *BCA 8030-8819-20 (Bima Satria)*, lalu upload bukti transfer di link reservasi Anda:\n🔗 {invoice_url}\n\nSalam hangat,\n*Kayastory Studio Semarang*`,
    PAYMENT_VERIFIED: `Halo Kak *{customer_name}*! ✨\n\nPembayaran Anda untuk sesi photoshoot wisuda telah *BERHASIL DIVERIFIKASI* ✅\n\n📄 *Rincian Pembayaran:*\n• No. Invoice: *{invoice_number}*\n• Paket: *{package_name}*\n• Jadwal Sesi: *{session_date} ({session_time} WIB)*\n• Nominal Diterima: *{payment_amount}*\n\nUnduh invoice resmi Anda melalui link berikut:\n🔗 {invoice_url}\n\nSampai jumpa di lokasi pemotretan ya Kak! 📸🎓\n*Kayastory Photography Semarang*`,
    REMINDER_H1: `Halo Kak *{customer_name}*! 🔔\n\nIni pengingat jadwal pemotretan wisuda Anda *BESOK*:\n📅 *{session_date}*\n⏰ *{session_time} WIB*\n📍 *{location}*\n📸 Fotografer: *{photographer}*\n\nMohon hadir 15 menit sebelum sesi dimulai agar kebaya & makeup siap optimal ya Kak. Sampai bertemu! ✨`,
    PHOTO_DELIVERY: `Halo Kak *{customer_name}*! 🎉\n\nFoto wisuda Anda telah selesai diproses color grading oleh tim *Kayastory*! 🎓✨\n\n📁 Akses seluruh foto RAW & master edit melalui link Google Drive resmi Anda:\n🔗 {drive_url}\n\nTerima kasih telah mempercayakan momen wisuda Anda bersama kami. Jangan lupa tag *@kayastory* di Instagram ya Kak! 📸❤️`,
  });

  // Email SMTP State
  const [smtpHost, setSmtpHost] = useState('smtp.gmail.com');
  const [smtpPort, setSmtpPort] = useState('587');
  const [smtpUser, setSmtpUser] = useState('studio@kayastory.id');
  const [smtpPassword, setSmtpPassword] = useState('••••••••••••••••');
  const [smtpSenderName, setSmtpSenderName] = useState('Kayastory Photography Studio');
  const [testEmail, setTestEmail] = useState('admin@kayastory.id');

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} Disalin!`);
  };

  const handleSendTestWA = () => {
    if (!testPhoneNumber) {
      toast.error('Masukkan nomor WhatsApp tujuan');
      return;
    }
    toast.success('Pesan Uji Coba Terkirim via Baileys WA!', {
      description: `Template "${selectedTemplate}" berhasil dikirim ke nomor ${testPhoneNumber}`,
    });
  };

  const handleSendTestEmail = () => {
    if (!testEmail) {
      toast.error('Masukkan email tujuan');
      return;
    }
    toast.success('Email Uji Coba Terkirim via SMTP!', {
      description: `Email uji coba dikirim ke ${testEmail}`,
    });
  };

  const handleSaveSettings = () => {
    toast.success('Pengaturan Berhasil Disimpan', {
      description: 'Konfigurasi Baileys WhatsApp & SMTP telah diperbarui.',
    });
  };

  const insertVariable = (variableName: string) => {
    setTemplates((prev) => ({
      ...prev,
      [selectedTemplate]: prev[selectedTemplate] + ` {${variableName}}`,
    }));
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200/80 dark:border-zinc-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-extrabold text-zinc-900 dark:text-white tracking-tight">
              Pengaturan & Integrasi
            </h1>
            <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 text-xs font-semibold">
              Gateway API
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Konfigurasi Baileys WhatsApp (Gratis/Self-hosted), notifikasi email SMTP, dan rekening studio.
          </p>
        </div>

        <Button
          onClick={handleSaveSettings}
          size="sm"
          className="h-9 gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold text-xs shadow-md shadow-amber-500/20"
        >
          <Save className="size-3.5" />
          Simpan Konfigurasi
        </Button>
      </div>

      {/* Tabs Menu */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-zinc-200/70 dark:bg-zinc-900 border border-zinc-300/80 dark:border-zinc-800 p-1 rounded-xl h-10 flex items-center gap-1 w-full sm:w-auto">
          <TabsTrigger
            value="whatsapp"
            className="text-xs px-3.5 py-1.5 rounded-lg text-zinc-700 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white data-active:bg-white dark:data-active:bg-zinc-800 data-active:text-amber-600 dark:data-active:text-amber-400 font-semibold data-active:shadow-sm transition-all gap-1.5"
          >
            <MessageSquare className="size-3.5" />
            WhatsApp Baileys
          </TabsTrigger>
          <TabsTrigger
            value="email"
            className="text-xs px-3.5 py-1.5 rounded-lg text-zinc-700 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white data-active:bg-white dark:data-active:bg-zinc-800 data-active:text-amber-600 dark:data-active:text-amber-400 font-semibold data-active:shadow-sm transition-all gap-1.5"
          >
            <Mail className="size-3.5" />
            Email SMTP
          </TabsTrigger>
          <TabsTrigger
            value="studio"
            className="text-xs px-3.5 py-1.5 rounded-lg text-zinc-700 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white data-active:bg-white dark:data-active:bg-zinc-800 data-active:text-amber-600 dark:data-active:text-amber-400 font-semibold data-active:shadow-sm transition-all gap-1.5"
          >
            <Building2 className="size-3.5" />
            Rekening & Studio
          </TabsTrigger>
        </TabsList>

        {/* ────────────────────────────────────────────────
            TAB 1: WHATSAPP BAILEYS (FREE / SELF-HOSTED)
        ──────────────────────────────────────────────── */}
        <TabsContent value="whatsapp" className="space-y-6 pt-4">
          {/* Connection Status Card */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <Card className="lg:col-span-8 rounded-xl border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/60 shadow-sm">
              <CardHeader className="pb-3 border-b border-zinc-100 dark:border-zinc-800/80">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <CardTitle className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                      <Smartphone className="size-4 text-emerald-500" />
                      Status Koneksi Baileys Multi-Device
                    </CardTitle>
                    <CardDescription className="text-xs text-zinc-500">
                      Engine WhatsApp gratis tanpa biaya langganan bulanan
                    </CardDescription>
                  </div>

                  <div className="flex items-center gap-2">
                    {waConnected ? (
                      <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 text-xs font-bold gap-1">
                        <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                        Terhubung
                      </Badge>
                    ) : (
                      <Badge className="bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/30 text-xs font-bold gap-1">
                        <span className="size-2 rounded-full bg-rose-500" />
                        Terputus
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="pt-4 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="space-y-1.5">
                    <label className="font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                      <Server className="size-3.5 text-zinc-400" />
                      Baileys Server Endpoint (Node.js)
                    </label>
                    <Input
                      value={waEndpoint}
                      onChange={(e) => setWaEndpoint(e.target.value)}
                      placeholder="http://localhost:8000/api/wa-baileys"
                      className="h-9 font-mono text-xs rounded-xl border-zinc-300 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950"
                    />
                    <p className="text-[10px] text-zinc-500">
                      Endpoint server backend Baileys yang berjalan mandiri di VPS/server lokal Anda.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                      <Key className="size-3.5 text-zinc-400" />
                      Secret API Key
                    </label>
                    <Input
                      type="password"
                      value={waApiKey}
                      onChange={(e) => setWaApiKey(e.target.value)}
                      className="h-9 font-mono text-xs rounded-xl border-zinc-300 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950"
                    />
                    <p className="text-[10px] text-zinc-500">
                      Kunci keamanan request webhook untuk mengautentikasi pengiriman pesan.
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border border-zinc-200 dark:border-zinc-800/80 bg-zinc-50/70 dark:bg-zinc-950/60 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-bold text-zinc-900 dark:text-white">
                      Nomor WhatsApp Terhubung: <span className="font-mono text-amber-600 dark:text-amber-400">{waSenderPhone}</span>
                    </div>
                    <div className="text-[11px] text-zinc-500 mt-0.5">
                      Session ID: <span className="font-mono">kayastory-main-session</span> • Baileys Protocol: v6.7.0 (WS WebSocket)
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        toast.info('Memperbarui status sesi Baileys...');
                        setWaConnected(true);
                      }}
                      className="h-8 text-xs gap-1 border-zinc-300 dark:border-zinc-700"
                    >
                      <RefreshCw className="size-3.5" />
                      Cek Status
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => setIsScanning(!isScanning)}
                      className="h-8 text-xs gap-1 bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 font-semibold hover:bg-zinc-800"
                    >
                      <QrCode className="size-3.5" />
                      Scan Ulang QR
                    </Button>
                  </div>
                </div>

                {/* Simulated QR Code Scan Box */}
                {isScanning && (
                  <div className="rounded-2xl border-2 border-dashed border-amber-500/40 bg-amber-500/[0.04] p-5 text-center space-y-3 animate-in fade-in zoom-in-95">
                    <div className="inline-flex size-36 items-center justify-center rounded-xl bg-white p-2 shadow-md border border-zinc-300 mx-auto">
                      {/* Simulated QR Pattern */}
                      <div className="size-full bg-zinc-900 flex flex-col justify-between p-2 rounded">
                        <div className="flex justify-between">
                          <div className="size-7 bg-white rounded-xs p-1"><div className="size-full bg-zinc-900" /></div>
                          <div className="size-7 bg-white rounded-xs p-1"><div className="size-full bg-zinc-900" /></div>
                        </div>
                        <div className="text-center font-mono text-[9px] text-white font-bold tracking-widest">
                          BAILEYS QR
                        </div>
                        <div className="flex justify-between">
                          <div className="size-7 bg-white rounded-xs p-1"><div className="size-full bg-zinc-900" /></div>
                          <div className="size-7 bg-white rounded-xs p-1"><div className="size-full bg-zinc-900" /></div>
                        </div>
                      </div>
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-zinc-900 dark:text-white">
                        Buka WhatsApp di HP & Scan QR Code Ini
                      </h4>
                      <p className="text-[11px] text-zinc-500 max-w-sm mx-auto mt-0.5">
                        Buka WhatsApp &gt; Perangkat Tertaut &gt; Tautkan Perangkat. Sesi otomatis tersimpan aman di server lokal.
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setIsScanning(false);
                        setWaConnected(true);
                        toast.success('WhatsApp Studio Berhasil Ditautkan!');
                      }}
                      className="h-7 text-xs border-amber-500/40 text-amber-600 dark:text-amber-400"
                    >
                      Simulasikan Scan Berhasil
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Test WhatsApp Dispatcher */}
            <Card className="lg:col-span-4 rounded-xl border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/60 shadow-sm flex flex-col justify-between">
              <CardHeader className="pb-3 border-b border-zinc-100 dark:border-zinc-800/80">
                <CardTitle className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-1.5">
                  <Send className="size-4 text-amber-500" />
                  Kirim Pesan Uji Coba
                </CardTitle>
                <CardDescription className="text-xs text-zinc-500">
                  Tes pengiriman live ke nomor WhatsApp Anda
                </CardDescription>
              </CardHeader>

              <CardContent className="pt-4 space-y-3.5">
                <div className="space-y-1.5 text-xs">
                  <label className="font-semibold text-zinc-700 dark:text-zinc-300">
                    Nomor WhatsApp Tujuan:
                  </label>
                  <Input
                    value={testPhoneNumber}
                    onChange={(e) => setTestPhoneNumber(e.target.value)}
                    placeholder="081234567890"
                    className="h-9 font-mono text-xs rounded-xl border-zinc-300 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950"
                  />
                </div>

                <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/50 p-3 text-xs space-y-1.5">
                  <span className="font-semibold text-[11px] text-zinc-500 uppercase tracking-wider">
                    Template Terpilih:
                  </span>
                  <div className="font-bold text-zinc-900 dark:text-white text-xs">
                    {selectedTemplate === 'NEW_BOOKING' && 'Notifikasi Booking Masuk (DP)'}
                    {selectedTemplate === 'PAYMENT_VERIFIED' && 'Verifikasi Pembayaran & Invoice'}
                    {selectedTemplate === 'REMINDER_H1' && 'Pengingat Jadwal H-1'}
                    {selectedTemplate === 'PHOTO_DELIVERY' && 'Penyerahan Link Google Drive Foto'}
                  </div>
                </div>

                <Button
                  onClick={handleSendTestWA}
                  className="w-full h-9 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1.5 shadow-sm shadow-emerald-600/20"
                >
                  <Send className="size-3.5" />
                  Kirim Pesan Uji Coba
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Template Editor & Realtime Live Preview */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Template Editor (7 cols) */}
            <Card className="lg:col-span-7 rounded-xl border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/60 shadow-sm">
              <CardHeader className="pb-3 border-b border-zinc-100 dark:border-zinc-800/80">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-sm font-bold text-zinc-900 dark:text-white">
                      Kustomisasi Template Pesan
                    </CardTitle>
                    <CardDescription className="text-xs text-zinc-500">
                      Pesan otomatis yang dikirimkan sistem saat trigger terjadi
                    </CardDescription>
                  </div>
                </div>

                {/* Template Selector Pills */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-3">
                  <button
                    type="button"
                    onClick={() => setSelectedTemplate('PAYMENT_VERIFIED')}
                    className={`px-2.5 py-1.5 text-xs rounded-lg font-semibold border transition-all text-center ${
                      selectedTemplate === 'PAYMENT_VERIFIED'
                        ? 'border-amber-500 bg-amber-500/10 text-amber-700 dark:text-amber-400'
                        : 'border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50'
                    }`}
                  >
                    Verifikasi Invoice
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedTemplate('NEW_BOOKING')}
                    className={`px-2.5 py-1.5 text-xs rounded-lg font-semibold border transition-all text-center ${
                      selectedTemplate === 'NEW_BOOKING'
                        ? 'border-amber-500 bg-amber-500/10 text-amber-700 dark:text-amber-400'
                        : 'border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50'
                    }`}
                  >
                    Booking Baru
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedTemplate('REMINDER_H1')}
                    className={`px-2.5 py-1.5 text-xs rounded-lg font-semibold border transition-all text-center ${
                      selectedTemplate === 'REMINDER_H1'
                        ? 'border-amber-500 bg-amber-500/10 text-amber-700 dark:text-amber-400'
                        : 'border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50'
                    }`}
                  >
                    Reminder H-1
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedTemplate('PHOTO_DELIVERY')}
                    className={`px-2.5 py-1.5 text-xs rounded-lg font-semibold border transition-all text-center ${
                      selectedTemplate === 'PHOTO_DELIVERY'
                        ? 'border-amber-500 bg-amber-500/10 text-amber-700 dark:text-amber-400'
                        : 'border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50'
                    }`}
                  >
                    Kirim Hasil Foto
                  </button>
                </div>
              </CardHeader>

              <CardContent className="pt-4 space-y-3.5">
                {/* Dynamic Variables Insertion Bar */}
                <div>
                  <span className="text-[11px] font-semibold text-zinc-500 block mb-1.5">
                    Klik untuk menyisipkan variabel dinamis:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { key: 'customer_name', label: 'Nama Klien' },
                      { key: 'booking_code', label: 'Kode Booking' },
                      { key: 'package_name', label: 'Nama Paket' },
                      { key: 'session_date', label: 'Tanggal Sesi' },
                      { key: 'session_time', label: 'Jam Sesi' },
                      { key: 'location', label: 'Lokasi' },
                      { key: 'total_price', label: 'Total Harga' },
                      { key: 'payment_amount', label: 'Nominal Bayar' },
                      { key: 'invoice_url', label: 'Link Invoice' },
                      { key: 'drive_url', label: 'Link Google Drive' },
                    ].map((v) => (
                      <button
                        key={v.key}
                        type="button"
                        onClick={() => insertVariable(v.key)}
                        className="inline-flex items-center gap-1 rounded-md border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 text-[10px] font-mono font-medium text-zinc-700 dark:text-zinc-300 hover:border-amber-500 hover:text-amber-600 transition-colors"
                      >
                        +{v.label}
                      </button>
                    ))}
                  </div>
                </div>

                <Textarea
                  value={templates[selectedTemplate]}
                  onChange={(e) =>
                    setTemplates({ ...templates, [selectedTemplate]: e.target.value })
                  }
                  rows={10}
                  className="font-mono text-xs leading-relaxed rounded-xl border-zinc-300 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 p-3.5 resize-none"
                />

                <div className="flex items-center justify-between text-xs text-zinc-500">
                  <span>Mendukung format WhatsApp: <strong>*tebal*</strong>, <em>_miring_</em>, ~coret~</span>
                  <Button
                    size="sm"
                    onClick={handleSaveSettings}
                    className="h-8 bg-amber-500 text-zinc-950 font-bold hover:bg-amber-600 text-xs"
                  >
                    Simpan Template
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Right: Live WhatsApp Bubble Simulator (5 cols) */}
            <div className="lg:col-span-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider">
                  Pratinjau Live WhatsApp
                </span>
                <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                  <Check className="size-3" /> Realtime Preview
                </span>
              </div>

              {/* WhatsApp Device Mockup */}
              <div className="rounded-2xl border border-zinc-300 dark:border-zinc-800 bg-[#efeae2] dark:bg-[#0b141a] p-4 shadow-inner min-h-[380px] flex flex-col justify-between">
                {/* WA Chat Header */}
                <div className="flex items-center gap-2.5 pb-3 border-b border-zinc-300/60 dark:border-zinc-800">
                  <div className="size-8 rounded-full bg-amber-500 text-zinc-950 font-bold text-xs flex items-center justify-center">
                    KS
                  </div>
                  <div>
                    <div className="font-bold text-xs text-zinc-900 dark:text-white">
                      Kayastory Photography
                    </div>
                    <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                      Official Studio Business Account
                    </div>
                  </div>
                </div>

                {/* WA Message Bubble */}
                <div className="my-auto py-2">
                  <div className="max-w-[90%] rounded-2xl rounded-tl-xs bg-white dark:bg-[#202c33] p-3.5 shadow-sm text-xs text-zinc-900 dark:text-zinc-100 whitespace-pre-wrap leading-relaxed border border-zinc-200/60 dark:border-transparent">
                    {templates[selectedTemplate]
                      .replace('{customer_name}', 'Anisa Rahmawati')
                      .replace('{booking_code}', 'KYA-2026-0814')
                      .replace('{package_name}', 'Solo Kebaya Signature')
                      .replace('{session_date}', '25 Agustus 2026')
                      .replace('{session_time}', '09:00 - 10:00')
                      .replace('{location}', 'Studio Tembalang')
                      .replace('{total_price}', 'Rp 450.000')
                      .replace('{payment_amount}', 'Rp 450.000 (Lunas)')
                      .replace('{invoice_number}', 'INV-KYA-2026-014')
                      .replace('{photographer}', 'Bima Satria')
                      .replace('{invoice_url}', 'https://kayastory.id/inv/KYA-0814')
                      .replace('{drive_url}', 'https://drive.google.com/drive/folders/kayastory-anisa')}
                    <div className="flex items-center justify-end gap-1 text-[10px] text-zinc-400 mt-1">
                      <span>14:32</span>
                      <span className="text-sky-500 font-bold">✓✓</span>
                    </div>
                  </div>
                </div>

                {/* WA Footer Simulator */}
                <div className="pt-2 text-center text-[10px] text-zinc-400 font-mono">
                  Enkripsi End-to-End • Baileys WhatsApp Engine
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ────────────────────────────────────────────────
            TAB 2: EMAIL SMTP NOTIFICATIONS
        ──────────────────────────────────────────────── */}
        <TabsContent value="email" className="space-y-6 pt-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <Card className="lg:col-span-8 rounded-xl border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/60 shadow-sm">
              <CardHeader className="pb-3 border-b border-zinc-100 dark:border-zinc-800/80">
                <CardTitle className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                  <Mail className="size-4 text-amber-500" />
                  Konfigurasi Email SMTP Server
                </CardTitle>
                <CardDescription className="text-xs text-zinc-500">
                  Untuk pengiriman salinan invoice digital PDF dan notifikasi internal admin
                </CardDescription>
              </CardHeader>

              <CardContent className="pt-4 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="space-y-1.5">
                    <label className="font-semibold text-zinc-700 dark:text-zinc-300">
                      SMTP Host Provider:
                    </label>
                    <Input
                      value={smtpHost}
                      onChange={(e) => setSmtpHost(e.target.value)}
                      placeholder="smtp.gmail.com"
                      className="h-9 rounded-xl border-zinc-300 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 font-mono text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-semibold text-zinc-700 dark:text-zinc-300">
                      Port SMTP:
                    </label>
                    <Input
                      value={smtpPort}
                      onChange={(e) => setSmtpPort(e.target.value)}
                      placeholder="587"
                      className="h-9 rounded-xl border-zinc-300 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 font-mono text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-semibold text-zinc-700 dark:text-zinc-300">
                      Email Pengirim (Username):
                    </label>
                    <Input
                      value={smtpUser}
                      onChange={(e) => setSmtpUser(e.target.value)}
                      placeholder="studio@kayastory.id"
                      className="h-9 rounded-xl border-zinc-300 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 font-mono text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-semibold text-zinc-700 dark:text-zinc-300">
                      Password / App Password:
                    </label>
                    <Input
                      type="password"
                      value={smtpPassword}
                      onChange={(e) => setSmtpPassword(e.target.value)}
                      className="h-9 rounded-xl border-zinc-300 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 font-mono text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-1.5 text-xs">
                  <label className="font-semibold text-zinc-700 dark:text-zinc-300">
                    Nama Pengirim Resmi (Sender Name):
                  </label>
                  <Input
                    value={smtpSenderName}
                    onChange={(e) => setSmtpSenderName(e.target.value)}
                    placeholder="Kayastory Photography Studio"
                    className="h-9 rounded-xl border-zinc-300 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-xs"
                  />
                </div>

                <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/60 p-3 text-xs space-y-2">
                  <div className="font-semibold text-zinc-900 dark:text-white">Trigger Notifikasi Otomatis:</div>
                  <div className="space-y-1.5 text-zinc-600 dark:text-zinc-300">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" defaultChecked className="rounded border-zinc-300 text-amber-500 focus:ring-amber-500" />
                      <span>Kirim invoice PDF ke email customer saat pembayaran diverifikasi</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" defaultChecked className="rounded border-zinc-300 text-amber-500 focus:ring-amber-500" />
                      <span>Kirim notifikasi ke email admin saat ada reservasi baru masuk</span>
                    </label>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Test Email Card */}
            <Card className="lg:col-span-4 rounded-xl border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/60 shadow-sm flex flex-col justify-between">
              <CardHeader className="pb-3 border-b border-zinc-100 dark:border-zinc-800/80">
                <CardTitle className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-1.5">
                  <Send className="size-4 text-amber-500" />
                  Kirim Email Uji Coba
                </CardTitle>
                <CardDescription className="text-xs text-zinc-500">
                  Verifikasi konektivitas SMTP server
                </CardDescription>
              </CardHeader>

              <CardContent className="pt-4 space-y-4">
                <div className="space-y-1.5 text-xs">
                  <label className="font-semibold text-zinc-700 dark:text-zinc-300">
                    Email Tujuan Uji Coba:
                  </label>
                  <Input
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                    placeholder="admin@kayastory.id"
                    className="h-9 font-mono text-xs rounded-xl border-zinc-300 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950"
                  />
                </div>

                <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/60 p-3 text-xs space-y-1 text-zinc-500">
                  <p>Email uji coba akan menyertakan ringkasan invoice simulasi dan status server.</p>
                </div>

                <Button
                  onClick={handleSendTestEmail}
                  className="w-full h-9 rounded-xl bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold text-xs gap-1.5 shadow-md shadow-amber-500/20"
                >
                  <Send className="size-3.5" />
                  Kirim Email Uji Coba
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ────────────────────────────────────────────────
            TAB 3: STUDIO & REKENING PEMBAYARAN
        ──────────────────────────────────────────────── */}
        <TabsContent value="studio" className="space-y-6 pt-4">
          <Card className="rounded-xl border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/60 shadow-sm">
            <CardHeader className="pb-3 border-b border-zinc-100 dark:border-zinc-800/80">
              <CardTitle className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                <Building2 className="size-4 text-amber-500" />
                Informasi Studio & Rekening Bank Resmi
              </CardTitle>
              <CardDescription className="text-xs text-zinc-500">
                Informasi pembayaran yang tertera pada invoice digital dan pesan instruksi WhatsApp klien
              </CardDescription>
            </CardHeader>

            <CardContent className="pt-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-zinc-900 dark:text-white">Bank BCA</span>
                    <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
                      Aktif Utama
                    </Badge>
                  </div>
                  <div className="font-mono text-sm font-bold text-amber-600 dark:text-amber-400">
                    8030-8819-20
                  </div>
                  <div className="text-zinc-500 text-[11px]">a.n Bima Satria (Studio Owner)</div>
                </div>

                <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-zinc-900 dark:text-white">Bank Mandiri</span>
                    <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
                      Aktif
                    </Badge>
                  </div>
                  <div className="font-mono text-sm font-bold text-amber-600 dark:text-amber-400">
                    136-00-1289-4412
                  </div>
                  <div className="text-zinc-500 text-[11px]">a.n Kayastory Photography</div>
                </div>

                <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-zinc-900 dark:text-white">QRIS All Payment</span>
                    <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 text-[10px] font-bold">
                      Gopay/OVO/Dana
                    </Badge>
                  </div>
                  <div className="font-mono text-xs font-semibold text-zinc-800 dark:text-zinc-300">
                    NMID: ID1020039481928
                  </div>
                  <div className="text-zinc-500 text-[11px]">Auto-generate dinamis per invoice</div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-2">
                <div className="space-y-1.5">
                  <label className="font-semibold text-zinc-700 dark:text-zinc-300">
                    Nama Studio:
                  </label>
                  <Input
                    defaultValue="Kayastory Photography Studio Semarang"
                    className="h-9 rounded-xl border-zinc-300 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-zinc-700 dark:text-zinc-300">
                    Alamat Studio Semarang:
                  </label>
                  <Input
                    defaultValue="Jl. Tirto Agung No. 12, Tembalang, Kota Semarang"
                    className="h-9 rounded-xl border-zinc-300 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-xs"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  onClick={handleSaveSettings}
                  className="h-9 rounded-xl bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold text-xs gap-1.5 shadow-md shadow-amber-500/20"
                >
                  <Save className="size-3.5" />
                  Simpan Perubahan Rekening
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
