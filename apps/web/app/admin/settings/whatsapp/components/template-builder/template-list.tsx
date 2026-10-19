'use client';

import { useState } from 'react';
import { Copy, Pencil, Plus, Zap } from 'lucide-react';
import { errorMessage } from '@/lib/admin-queries';
import type { TemplateHealthLevel, WhatsappTemplate } from '@/lib/whatsapp-template-api';
import {
  useDuplicateWhatsappTemplate,
  useSetWhatsappTemplateActive,
  useWhatsappTemplateVariables,
  useWhatsappTemplates,
} from '@/lib/whatsapp-template-queries';
import { QueryError, QueryLoading } from '../../../../components/query-state';
import TemplateEditorWorkspace from './template-editor-workspace';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';

const HEALTH_DOT: Record<TemplateHealthLevel, { color: string; label: string }> = {
  good: { color: 'bg-emerald-500', label: 'Pesan sehat' },
  warning: { color: 'bg-amber-500', label: 'Perlu perhatian' },
  error: { color: 'bg-rose-500', label: 'Ada masalah' },
};

function TemplateCard({
  template,
  categoryLabel,
  onEdit,
}: {
  template: WhatsappTemplate;
  categoryLabel: string;
  onEdit: () => void;
}) {
  const setActive = useSetWhatsappTemplateActive();
  const duplicate = useDuplicateWhatsappTemplate();
  const health = template.health ? HEALTH_DOT[template.health] : null;

  return (
    <Card className="h-full rounded-xl border-zinc-200/80 bg-white shadow-sm dark:border-zinc-800/80 dark:bg-zinc-900/60">
      <CardContent className="flex h-full flex-col justify-between gap-5 p-5">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h3
              id={`wa-tpl-${template.id}`}
              className="text-sm font-bold text-zinc-900 dark:text-white"
            >
              {template.name}
            </h3>
            <Badge variant="outline" className="text-[10px]">
              {template.isSystem ? 'Bawaan' : 'Custom'}
            </Badge>
            <Badge variant="secondary" className="text-[10px]">
              {categoryLabel}
            </Badge>
            {health && (
              <span
                title={health.label}
                role="img"
                aria-label={health.label}
                className={`size-2 rounded-full ${health.color}`}
              />
            )}
          </div>
          {template.trigger ? (
            <p className="flex items-center gap-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
              <Zap className="size-3.5" />
              {template.trigger}
            </p>
          ) : (
            <p className="text-xs text-zinc-500">Dikirim lewat Mini CRM</p>
          )}
          <p className="line-clamp-2 whitespace-pre-line text-xs text-zinc-600 dark:text-zinc-400">
            {template.body}
          </p>
        </div>

        <div className="flex shrink-0 items-center justify-between gap-3 border-t border-zinc-100 pt-4 dark:border-zinc-800/80">
          <div className="flex items-center gap-2">
            <span
              className={`text-xs font-semibold ${
                template.isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-500'
              }`}
            >
              {template.isActive ? 'Aktif' : 'Mati'}
            </span>
            <Switch
              checked={template.isActive}
              disabled={setActive.isPending}
              onCheckedChange={(isActive) => setActive.mutate({ id: template.id, isActive })}
              aria-labelledby={`wa-tpl-${template.id}`}
            />
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon-sm"
              aria-label={`Duplikat ${template.name}`}
              disabled={duplicate.isPending}
              onClick={() => duplicate.mutate(template.id)}
            >
              <Copy className="size-3.5" />
            </Button>
            <Button size="sm" onClick={onEdit} className="gap-1.5">
              <Pencil className="size-3.5" />
              Edit
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function WhatsappTemplatesTab() {
  const templates = useWhatsappTemplates();
  const options = useWhatsappTemplateVariables();
  // undefined = showing the list, null = writing a new template, otherwise editing that one.
  const [editing, setEditing] = useState<WhatsappTemplate | null | undefined>(undefined);

  if (editing !== undefined) {
    return <TemplateEditorWorkspace template={editing} onClose={() => setEditing(undefined)} />;
  }
  if (templates.isLoading) return <QueryLoading rows={4} />;
  if (templates.isError || !templates.data) {
    return (
      <QueryError
        title="Template tidak dapat dimuat"
        message={errorMessage(templates.error)}
        retry={() => templates.refetch()}
      />
    );
  }
  const categoryLabel = (value: string) =>
    options.data?.categories.find((category) => category.value === value)?.label ?? value;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-xl text-xs text-zinc-500">
          Template yang aktif muncul di Mini CRM. Template otomatis yang dimatikan berarti customer
          tidak menerima WhatsApp untuk kejadian itu.
        </p>
        <Button
          size="sm"
          onClick={() => setEditing(null)}
          className="gap-1.5 bg-amber-500 font-bold text-zinc-950 hover:bg-amber-600"
        >
          <Plus className="size-3.5" />
          Buat Template Baru
        </Button>
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        {templates.data.map((template) => (
          <TemplateCard
            key={template.id}
            template={template}
            categoryLabel={categoryLabel(template.category)}
            onEdit={() => setEditing(template)}
          />
        ))}
        <button
          type="button"
          onClick={() => setEditing(null)}
          className="flex min-h-40 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-zinc-300 text-sm font-semibold text-zinc-500 transition-colors hover:border-amber-500/60 hover:bg-amber-500/[0.04] hover:text-amber-600 dark:border-zinc-700"
        >
          <Plus className="size-5" />
          Buat template baru
        </button>
      </div>
    </div>
  );
}
