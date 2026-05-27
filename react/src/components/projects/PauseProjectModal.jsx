import { useState } from 'react';
import { Pause, AlertTriangle } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Textarea } from '../ui/Textarea';
import { Select } from '../ui/Select';

const PAUSE_REASON_PRESETS = [
  { value: '', label: 'Sélectionner une raison…' },
  { value: 'Attente de validation client',    label: 'Attente de validation client' },
  { value: 'Problème budgétaire',             label: 'Problème budgétaire' },
  { value: 'Dépendance externe bloquante',    label: 'Dépendance externe bloquante' },
  { value: 'Bug critique en cours de résolution', label: 'Bug critique en cours de résolution' },
  { value: 'Maintenance planifiée',           label: 'Maintenance planifiée' },
  { value: 'Réorganisation interne',          label: 'Réorganisation interne' },
  { value: 'Autre',                           label: 'Autre (préciser ci-dessous)' },
];

/**
 * Confirmation modal displayed before pausing a project.
 * Requires the user to provide a pause reason (preset + optional detail).
 *
 * Props:
 *   open        {boolean}   — modal visibility
 *   onClose     {() => void}
 *   onConfirm   {(reason: string) => Promise<void>}
 *   isPausing   {boolean}   — loading state
 *   projectName {string}
 */
export default function PauseProjectModal({ open, onClose, onConfirm, isPausing, projectName }) {
  const [preset, setPreset]     = useState('');
  const [detail, setDetail]     = useState('');
  const [error, setError]       = useState('');

  const finalReason = preset === 'Autre' || preset === ''
    ? detail.trim()
    : preset + (detail.trim() ? ` — ${detail.trim()}` : '');

  const handleConfirm = async () => {
    if (!finalReason || finalReason.length < 5) {
      setError('Veuillez saisir une raison de pause (minimum 5 caractères).');
      return;
    }
    setError('');
    try {
      await onConfirm(finalReason);
      // Reset after success
      setPreset('');
      setDetail('');
    } catch {
      // Error is handled by the hook, but we keep modal open
    }
  };

  const handleClose = () => {
    if (isPausing) return;
    setPreset('');
    setDetail('');
    setError('');
    onClose();
  };

  return (
    <Modal open={open} onClose={handleClose} title="">
      {/* Custom header */}
      <div className="mb-5 flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600">
          <Pause className="h-5 w-5" />
        </span>
        <div>
          <h2 className="text-lg font-semibold text-foreground">Mettre le projet en pause</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {projectName && <span className="font-medium text-foreground">{projectName}</span>}
            {projectName && ' — '}
            Cette action va verrouiller toutes les modifications du projet.
          </p>
        </div>
      </div>

      {/* Warning */}
      <div className="mb-5 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <div>
          <p className="font-medium">En mode pause, les membres ne pourront plus&nbsp;:</p>
          <ul className="mt-1 list-inside list-disc space-y-0.5 text-amber-800">
            <li>Créer, modifier ou supprimer des tâches</li>
            <li>Déplacer des cartes Kanban</li>
            <li>Ajouter des commentaires ou pièces jointes</li>
            <li>Modifier les paramètres du projet</li>
          </ul>
        </div>
      </div>

      {/* Reason preset */}
      <div className="mb-3">
        <label className="mb-1.5 block text-sm font-medium text-foreground">
          Raison de la pause <span className="text-destructive">*</span>
        </label>
        <Select
          value={preset}
          onChange={(e) => {
            setPreset(e.target.value);
            setError('');
          }}
          className="w-full"
        >
          {PAUSE_REASON_PRESETS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </Select>
      </div>

      {/* Detail / custom reason */}
      <div className="mb-4">
        <label className="mb-1.5 block text-sm font-medium text-foreground">
          {preset === 'Autre' || preset === ''
            ? <span>Précisez la raison <span className="text-destructive">*</span></span>
            : 'Détails complémentaires (optionnel)'
          }
        </label>
        <Textarea
          value={detail}
          onChange={(e) => {
            setDetail(e.target.value);
            setError('');
          }}
          placeholder={
            preset === 'Autre' || preset === ''
              ? 'Décrivez la raison de la pause…'
              : 'Contexte supplémentaire (facultatif)…'
          }
          rows={3}
          className="w-full resize-none"
          disabled={isPausing}
        />
        {error && (
          <p className="mt-1.5 text-xs text-destructive">{error}</p>
        )}
      </div>

      {/* Preview */}
      {finalReason.length >= 5 && (
        <div className="mb-4 rounded-md border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Raison enregistrée : </span>
          {finalReason}
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={handleClose} disabled={isPausing}>
          Annuler
        </Button>
        <Button
          onClick={handleConfirm}
          disabled={isPausing || finalReason.length < 5}
          className="bg-amber-500 hover:bg-amber-600 text-white border-0"
        >
          {isPausing ? (
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Mise en pause…
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Pause className="h-4 w-4" />
              Confirmer la pause
            </span>
          )}
        </Button>
      </div>
    </Modal>
  );
}
