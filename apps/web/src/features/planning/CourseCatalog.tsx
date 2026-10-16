import { Check, Lock, Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { ChoiceGroup } from '@/features/courses/ChoiceGroup';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { formatHours, pluralize, toTitleCase } from '@/lib/format';
import { cn } from '@/lib/utils';
import { CATALOG_FILTERS, filterCatalog, formatMissing, type CatalogFilter, type CatalogItem } from './planning-catalog';

const CATEGORY_NAMES = { obrigatoria: 'Obrigatória', eletiva: 'Eletiva', extensao: 'Extensão' } as const;

interface CourseCatalogProps {
  items: readonly CatalogItem[];
  /** Codes suggested for next term ("Sugeridas"). */
  suggested: ReadonlySet<string>;
  /** Codes already chosen for next term. */
  selected: ReadonlySet<string>;
  countInProgress: boolean;
  onCountInProgressChange: (value: boolean) => void;
  onToggle: (item: CatalogItem) => void;
}

function CatalogRow({ item, added, onToggle }: { item: CatalogItem; added: boolean; onToggle: () => void }) {
  const blocked = item.missing.length > 0;
  const name = toTitleCase(item.name);
  return (
    <li className="flex items-start gap-4 py-4">
      <div className="grid min-w-0 flex-1 gap-1">
        <p className="font-semibold">{name}</p>
        <p className="text-sm text-ink-muted tabular-nums">
          <span className="code-label">{item.code}</span>, {CATEGORY_NAMES[item.category]}
          {item.idealPeriod !== null && <>, período ideal {item.idealPeriod}</>}, {pluralize(item.credits, 'crédito', 'créditos')},{' '}
          {formatHours(item.hours)}
        </p>
        <p className="text-sm text-ink-muted">{item.reason}</p>
        {blocked && (
          <p className="flex items-start gap-1.5 text-sm text-ink">
            <Lock aria-hidden className="mt-0.5 size-4 shrink-0 text-ink-muted" />
            <span>Falta: {formatMissing(item.missing)}</span>
          </p>
        )}
      </div>
      <Button
        type="button"
        variant={added ? 'ghost' : 'outline'}
        aria-label={added ? `Remover ${name} do semestre` : `Adicionar ${name} ao semestre`}
        className={cn(
          'max-md:h-11 shrink-0',
          added &&
            'bg-pen-tint text-pen-ink hover:bg-pen-tint/80 hover:text-pen-ink dark:hover:bg-pen-tint/80',
        )}
        disabled={blocked && !added}
        onClick={onToggle}
      >
        <span aria-hidden className="relative grid size-4 shrink-0 place-items-center">
          <Plus
            className={cn(
              'col-start-1 row-start-1 transition-[opacity,filter] duration-200 ease-snap motion-reduce:duration-150',
              added ? 'opacity-0 blur-[2px]' : 'opacity-100',
            )}
          />
          <Check
            className={cn(
              'col-start-1 row-start-1 transition-[opacity,filter] duration-200 ease-snap motion-reduce:duration-150',
              added ? 'opacity-100' : 'opacity-0 blur-[2px]',
            )}
          />
        </span>
        {added ? 'No semestre' : 'Adicionar'}
      </Button>
    </li>
  );
}

export function CourseCatalog({
  items,
  suggested,
  selected,
  countInProgress,
  onCountInProgressChange,
  onToggle,
}: CourseCatalogProps) {
  const [filter, setFilter] = useState<CatalogFilter>('sugeridas');
  const [query, setQuery] = useState('');
  const visible = useMemo(
    () => filterCatalog(items, { filter, query, suggested, selected }),
    [items, filter, query, suggested, selected],
  );
  // Each chip shows how many courses it holds, ignoring the search, so the counts describe the whole catalog.
  const counts = useMemo(
    () => new Map(CATALOG_FILTERS.map((f) => [f.value, filterCatalog(items, { filter: f.value, query: '', suggested, selected }).length])),
    [items, suggested, selected],
  );

  return (
    <section aria-label="Próximo semestre" className="grid content-start gap-4">
      <div className="grid gap-3">
        <Label htmlFor="busca-disciplinas" className="font-normal text-ink-muted">
          Buscar por código ou nome
        </Label>
        <Input
          id="busca-disciplinas"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Ex.: ICC412 ou Cálculo"
          className="h-11 md:h-9 md:pointer-coarse:h-11"
        />
        <div className="flex items-center gap-2">
          <Switch
            id="contar-em-curso"
            checked={countInProgress}
            onCheckedChange={onCountInProgressChange}
            className="max-md:after:-inset-y-3.5"
          />
          <Label htmlFor="contar-em-curso" className="font-normal text-ink-muted max-md:min-h-11">
            Supor aprovação no que está em curso
          </Label>
        </div>
      </div>

      <ChoiceGroup<CatalogFilter>
        label="Filtrar disciplinas"
        items={CATALOG_FILTERS.map((f) => {
          const count = counts.get(f.value) ?? 0;
          return {
            value: f.value,
            // The visible label and count are hidden from the name; the screen-reader text reads "Eletivas, 97" once.
            content: (
              <>
                <span aria-hidden>{f.label}</span>
                <span aria-hidden className="tabular-nums opacity-70">
                  {count}
                </span>
                <span className="sr-only">
                  {f.label}, {count}
                </span>
              </>
            ),
          };
        })}
        value={filter}
        onValueChange={setFilter}
        className="flex flex-wrap gap-2"
        itemClassName="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-hairline px-3 text-sm text-foreground outline-none transition-colors duration-150 ease-snap focus-visible:ring-3 focus-visible:ring-ring/50 aria-[checked=false]:hover:bg-muted aria-checked:border-ink aria-checked:bg-ink aria-checked:text-canvas md:min-h-8 md:pointer-coarse:min-h-11"
      />

      {visible.length === 0 ? (
        <p className="rounded-lg border border-dashed border-hairline p-6 text-ink-muted">
          Nenhuma disciplina nesse filtro. Tente outra busca ou outro filtro.
        </p>
      ) : (
        <ul className="divide-y divide-hairline border-t border-hairline">
          {visible.map((item) => (
            <CatalogRow key={item.code} item={item} added={selected.has(item.code)} onToggle={() => onToggle(item)} />
          ))}
        </ul>
      )}
    </section>
  );
}
