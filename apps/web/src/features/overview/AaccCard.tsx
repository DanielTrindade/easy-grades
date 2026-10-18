import { useId, useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AACC_MAX_ITEMS,
  AACC_TYPE_LABELS,
  AACC_TYPES,
  AaccInputSchema,
  type AaccActivity,
  type AaccInput,
  type AaccType,
} from '@/lib/aacc-storage';
import { formatHours } from '@/lib/format';

interface AaccCardProps {
  /** Hours already on the official transcript in the AACC category. */
  officialHours: number;
  requiredHours: number;
  /** Registered hours that count toward the progress, capped at what the category requires. */
  countedHours: number;
  activities: AaccActivity[];
  loading: boolean;
  onAdd: (input: AaccInput) => void;
  onRemove: (id: string) => void;
}

type FieldErrors = Partial<Record<'description' | 'hours', string>>;

/** Complementary activities the student has done but the coordination has not posted yet. */
export function AaccCard({
  officialHours,
  requiredHours,
  countedHours,
  activities,
  loading,
  onAdd,
  onRemove,
}: AaccCardProps) {
  const [description, setDescription] = useState('');
  const [hours, setHours] = useState('');
  const [type, setType] = useState<AaccType>('ensino');
  const [errors, setErrors] = useState<FieldErrors>({});
  const descriptionId = useId();
  const hoursId = useId();
  const typeId = useId();

  const registeredHours = activities.reduce((sum, activity) => sum + activity.hours, 0);
  const full = activities.length >= AACC_MAX_ITEMS;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = AaccInputSchema.safeParse({ description, hours: Number(hours), type });
    if (!result.success) {
      const next: FieldErrors = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0];
        if ((field === 'description' || field === 'hours') && !next[field]) next[field] = issue.message;
      }
      setErrors(next);
      return;
    }
    onAdd(result.data);
    setDescription('');
    setHours('');
    setErrors({});
  }

  return (
    <section aria-labelledby="atividades-complementares" className="grid min-w-0 scroll-mt-20 gap-6 rounded-card bg-surface p-5 md:scroll-mt-24">
      <div className="grid gap-2">
        <h2 id="atividades-complementares" className="text-title3">
          Atividades complementares
        </h2>
        <p className="max-w-[60ch] text-sm text-muted-foreground">
          Registre as atividades que você já fez e ainda não aparecem no histórico. Elas ficam só neste navegador.
        </p>
      </div>

      <div className="grid gap-1 text-sm">
        <p>{`Oficial no histórico: ${formatHours(officialHours)} de ${formatHours(requiredHours)}`}</p>
        <p className="font-medium">{`Registradas por você: ${formatHours(registeredHours)} (pendentes)`}</p>
        {countedHours < registeredHours && (
          <p className="text-muted-foreground">
            {`Só ${formatHours(countedHours)} entram no progresso, até o total exigido na categoria.`}
          </p>
        )}
      </div>

      {officialHours > 0 && activities.length > 0 && (
        <p role="status" className="rounded-lg border border-danger/40 bg-danger/10 p-3 text-sm">
          {`O histórico já tem ${formatHours(officialHours)} lançadas. Confira se alguma atividade registrada aqui já foi lançada e remova-a para não contar duas vezes.`}
        </p>
      )}

      <form onSubmit={handleSubmit} noValidate className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_7rem_11rem] sm:items-end">
        <div className="grid gap-2">
          <Label htmlFor={descriptionId}>Descrição</Label>
          <Input
            id={descriptionId}
            className="max-md:h-11"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            aria-invalid={errors.description ? true : undefined}
            aria-describedby={errors.description ? `${descriptionId}-erro` : undefined}
          />
          {errors.description && (
            <p id={`${descriptionId}-erro`} role="alert" className="text-sm text-danger">
              {errors.description}
            </p>
          )}
        </div>

        <div className="grid gap-2">
          <Label htmlFor={hoursId}>Horas</Label>
          <Input
            id={hoursId}
            className="max-md:h-11"
            type="number"
            inputMode="numeric"
            min={1}
            max={500}
            step={1}
            value={hours}
            onChange={(event) => setHours(event.target.value)}
            aria-invalid={errors.hours ? true : undefined}
            aria-describedby={errors.hours ? `${hoursId}-erro` : undefined}
          />
          {errors.hours && (
            <p id={`${hoursId}-erro`} role="alert" className="text-sm text-danger">
              {errors.hours}
            </p>
          )}
        </div>

        <div className="grid gap-2">
          <Label htmlFor={typeId}>Tipo</Label>
          <Select value={type} onValueChange={(value) => setType(value as AaccType)}>
            <SelectTrigger id={typeId} className="w-full max-md:data-[size=default]:h-11">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {AACC_TYPES.map((option) => (
                <SelectItem key={option} value={option}>
                  {AACC_TYPE_LABELS[option]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="sm:col-span-3">
          <Button type="submit" disabled={loading || full} className="max-md:h-11">
            Registrar atividade
          </Button>
          {full && (
            <p className="mt-2 text-sm text-muted-foreground">
              {`Você já registrou ${AACC_MAX_ITEMS} atividades. Remova alguma para registrar outra.`}
            </p>
          )}
        </div>
      </form>

      {activities.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhuma atividade registrada ainda.</p>
      ) : (
        <ul className="divide-y divide-border">
          {activities.map((activity) => (
            <li key={activity.id} className="flex items-center justify-between gap-4 py-3">
              <div className="min-w-0">
                <p className="break-words font-medium">{activity.description}</p>
                <p className="text-sm text-muted-foreground">{AACC_TYPE_LABELS[activity.type]}</p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <span className="text-sm">{formatHours(activity.hours)}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="max-md:h-11"
                  aria-label={`Remover ${activity.description}`}
                  onClick={() => onRemove(activity.id)}
                >
                  Remover
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
