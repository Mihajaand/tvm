
import React from 'react';
import { MapPin, Plus, Building2, Trash2, Crosshair, CircleDot } from 'lucide-react';
import { OfficeLocation } from '../../types';
import OfficeLocationMap from './OfficeLocationMap';

interface Props {
  locations: OfficeLocation[];
  onAdd: () => void;
  onEdit: (index: number) => void;
  onDelete: (index: number) => void;
}

export const OrgPlacement: React.FC<Props> = ({ locations, onAdd, onEdit, onDelete }) => {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="grid gap-6 xl:grid-cols-[1.35fr_0.85fr]">
        <section className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 px-6 py-5">
          <div>
            <div className="flex items-center gap-2 text-teal-800">
              <MapPin size={17} />
              <h3 className="text-xs font-black uppercase tracking-[0.16em]">Carte des sites</h3>
            </div>
            <p className="mt-1 text-xs text-slate-500">Chaque cercle représente la zone de pointage autorisée.</p>
          </div>
          <span className="rounded-full bg-teal-50 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-teal-800">
            {locations.length} {locations.length === 1 ? 'site' : 'sites'}
          </span>
        </div>
        <div className="p-3 sm:p-4">
          <OfficeLocationMap
            locations={locations}
            heightClass="h-[340px] sm:h-[430px]"
            onLocationSelect={onEdit}
          />
        </div>
        <div className="flex items-center gap-2 border-t border-slate-100 px-6 py-4 text-[11px] text-slate-500">
          <CircleDot size={14} className="text-teal-700" />
          Les cercles et les rayons sont affichés à l’échelle de la carte.
        </div>
        </section>

        <section className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
          <div>
            <div className="flex items-center gap-2 text-slate-800">
              <Crosshair size={16} className="text-teal-700" />
              <h3 className="text-xs font-black uppercase tracking-[0.16em]">Sites configurés</h3>
            </div>
            <p className="mt-1 text-xs text-slate-500">Gérez le centre et la portée de chaque zone.</p>
          </div>
          <button
            type="button"
            onClick={onAdd}
            aria-label="Ajouter un emplacement"
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white transition hover:bg-teal-800"
          >
            <Plus size={18} />
          </button>
        </div>
        <div className="space-y-3 p-4">
          {locations.map((loc, i) => (
            <article key={`${loc.name}-${i}`} className="group rounded-2xl border border-slate-100 bg-slate-50/70 p-4 transition hover:border-teal-200 hover:bg-white">
              <div className="flex items-start justify-between gap-3">
                <button type="button" onClick={() => onEdit(i)} className="min-w-0 flex-1 text-left">
                  <span className="block truncate text-sm font-bold text-slate-900">{loc.name || `Site ${i + 1}`}</span>
                  <span className="mt-1 block font-mono text-[10px] text-slate-500">
                    {Number.isFinite(loc.lat) ? loc.lat.toFixed(5) : '—'}, {Number.isFinite(loc.lng) ? loc.lng.toFixed(5) : '—'}
                  </span>
                </button>
                <div className="flex shrink-0 gap-1">
                  <button type="button" onClick={() => onEdit(i)} aria-label={`Modifier ${loc.name}`} className="rounded-lg p-2 text-slate-400 transition hover:bg-teal-50 hover:text-teal-800">
                    <Building2 size={15} />
                  </button>
                  <button type="button" onClick={() => onDelete(i)} aria-label={`Supprimer ${loc.name}`} className="rounded-lg p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600">
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-slate-200/70 pt-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Rayon autorisé</span>
                <span className="rounded-lg bg-teal-50 px-2.5 py-1 text-xs font-black tabular-nums text-teal-800">{loc.radius} m</span>
              </div>
            </article>
          ))}
          {locations.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-300 px-5 py-10 text-center">
              <MapPin size={25} className="mx-auto text-slate-300" />
              <p className="mt-3 text-sm font-bold text-slate-700">Aucun site configuré</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-500">Ajoutez un emplacement pour définir une zone de pointage et la visualiser sur la carte.</p>
              <button type="button" onClick={onAdd} className="mt-4 rounded-xl bg-teal-800 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-teal-700">
                Ajouter le premier site
              </button>
            </div>
          )}
        </div>
        </section>
      </div>
    </div>
  );
};
