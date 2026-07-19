import Phaser from 'phaser';
import './review.css';
import { SPECIES_LIST, getSpecies, type Species } from '../data/creatures';
import { ELEMENT_TYPES, TYPE_META, type ElementType } from '../data/types';
import { hashString } from '../systems/rng';
import { pickArchetype, type Archetype } from '../gfx/creatureParts';
import { generateAllTextures, CREATURE_SIZE } from '../gfx/textures';

const STORAGE_KEY = 'creaturecatch.rosterFeedback.v1';

interface FeedbackEntry {
  rating: number; // 0..5
  notes: string;
  updatedAt: string;
}

type FeedbackMap = Record<string, FeedbackEntry>;

const spriteUrls = new Map<string, string>();
let selectedId: string | null = null;
let feedback: FeedbackMap = loadFeedback();

function loadFeedback(): FeedbackMap {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as FeedbackMap;
  } catch {
    return {};
  }
}

function saveFeedback() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(feedback));
}

function toast(msg: string) {
  document.querySelectorAll('.toast').forEach((el) => el.remove());
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  document.body.appendChild(el);
  window.setTimeout(() => el.remove(), 2200);
}

function entryFor(id: string): FeedbackEntry {
  return feedback[id] ?? { rating: 0, notes: '', updatedAt: '' };
}

function hasFeedback(id: string): boolean {
  const e = entryFor(id);
  return e.rating > 0 || e.notes.trim().length > 0;
}

function stageLabel(stage: number): string {
  return stage === 0 ? 'Base' : stage === 1 ? 'Mid' : 'Final';
}

function evoChain(sp: Species): string {
  const line = SPECIES_LIST.filter((s) => s.lineId === sp.lineId).sort((a, b) => a.stage - b.stage);
  return line.map((s) => (s.id === sp.id ? `【${s.name}】` : s.name)).join(' → ');
}

function bakeSprites(): Promise<void> {
  return new Promise((resolve, reject) => {
    class BakeScene extends Phaser.Scene {
      constructor() {
        super('Bake');
      }
      create() {
        try {
          generateAllTextures(this);
          for (const sp of SPECIES_LIST) {
            const key = `creature_${sp.id}`;
            const tex = this.textures.get(key);
            const src = tex.getSourceImage() as HTMLCanvasElement | HTMLImageElement;
            if ('toDataURL' in src) {
              spriteUrls.set(sp.id, src.toDataURL('image/png'));
            } else {
              const c = document.createElement('canvas');
              c.width = CREATURE_SIZE;
              c.height = CREATURE_SIZE;
              const ctx = c.getContext('2d')!;
              ctx.drawImage(src, 0, 0);
              spriteUrls.set(sp.id, c.toDataURL('image/png'));
            }
          }
          resolve();
        } catch (err) {
          reject(err);
        } finally {
          this.game.destroy(true);
        }
      }
    }

    new Phaser.Game({
      type: Phaser.CANVAS,
      width: CREATURE_SIZE,
      height: CREATURE_SIZE,
      parent: 'bake',
      banner: false,
      audio: { noAudio: true },
      scene: BakeScene,
      render: { antialias: false, pixelArt: true },
    });
  });
}

function populateFilters() {
  const typeSel = document.getElementById('filter-type') as HTMLSelectElement;
  for (const t of ELEMENT_TYPES) {
    const opt = document.createElement('option');
    opt.value = t;
    opt.textContent = TYPE_META[t].name;
    typeSel.appendChild(opt);
  }

  const arches = new Set<Archetype>();
  for (const sp of SPECIES_LIST) {
    arches.add(pickArchetype(sp.name, hashString(sp.id)));
  }
  const archSel = document.getElementById('filter-arch') as HTMLSelectElement;
  [...arches].sort().forEach((a) => {
    const opt = document.createElement('option');
    opt.value = a;
    opt.textContent = a;
    archSel.appendChild(opt);
  });
}

function filteredSpecies(): Species[] {
  const q = (document.getElementById('search') as HTMLInputElement).value.trim().toLowerCase();
  const type = (document.getElementById('filter-type') as HTMLSelectElement).value as ElementType | '';
  const arch = (document.getElementById('filter-arch') as HTMLSelectElement).value;
  const stage = (document.getElementById('filter-stage') as HTMLSelectElement).value;
  const notes = (document.getElementById('filter-notes') as HTMLSelectElement).value;

  return SPECIES_LIST.filter((sp) => {
    const a = pickArchetype(sp.name, hashString(sp.id));
    if (type && sp.types[0] !== type) return false;
    if (arch && a !== arch) return false;
    if (stage !== '' && String(sp.stage) !== stage) return false;
    if (notes === 'has' && !hasFeedback(sp.id)) return false;
    if (notes === 'missing' && hasFeedback(sp.id)) return false;
    if (q) {
      const hay = `${sp.name} ${sp.id} ${sp.lineId} ${a} #${sp.dexNumber}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

function renderGrid() {
  const grid = document.getElementById('grid')!;
  const list = filteredSpecies();
  document.getElementById('count')!.textContent = `${list.length} / ${SPECIES_LIST.length}`;

  grid.replaceChildren();
  if (list.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty';
    empty.textContent = 'No creatures match these filters.';
    grid.appendChild(empty);
    return;
  }

  for (const sp of list) {
    const type = sp.types[0] as ElementType;
    const arch = pickArchetype(sp.name, hashString(sp.id));
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'card' + (selectedId === sp.id ? ' active' : '');
    btn.dataset.id = sp.id;

    const img = document.createElement('img');
    img.src = spriteUrls.get(sp.id) ?? '';
    img.alt = sp.name;
    img.width = CREATURE_SIZE;
    img.height = CREATURE_SIZE;

    const name = document.createElement('div');
    name.className = 'name';
    name.textContent = sp.name;

    const tags = document.createElement('div');
    tags.className = 'tags';
    const reviewed = hasFeedback(sp.id);
    tags.innerHTML = `<span class="dot ${reviewed ? '' : 'off'}"></span>#${sp.dexNumber} · ${arch} · ${stageLabel(sp.stage)}`;

    const badge = document.createElement('span');
    badge.className = 'badge';
    badge.style.background = TYPE_META[type].cssColor;
    badge.textContent = TYPE_META[type].name;

    btn.append(img, name, tags, badge);
    btn.addEventListener('click', () => selectCreature(sp.id));
    grid.appendChild(btn);
  }
}

function selectCreature(id: string) {
  selectedId = id;
  const sp = getSpecies(id);
  const type = sp.types[0] as ElementType;
  const arch = pickArchetype(sp.name, hashString(sp.id));
  const e = entryFor(id);

  const detail = document.getElementById('detail')!;
  detail.hidden = false;

  (document.getElementById('detail-img') as HTMLImageElement).src = spriteUrls.get(id) ?? '';
  document.getElementById('detail-name')!.textContent = sp.name;
  document.getElementById('detail-meta')!.textContent =
    `#${sp.dexNumber} · ${TYPE_META[type].name} · ${arch} · ${stageLabel(sp.stage)} · catch ${sp.catchRate}`;
  document.getElementById('detail-evo')!.textContent = evoChain(sp);

  const stats = document.getElementById('detail-stats')!;
  stats.replaceChildren();
  const pairs: [string, number][] = [
    ['HP', sp.baseStats.hp],
    ['Attack', sp.baseStats.attack],
    ['Defense', sp.baseStats.defense],
    ['Speed', sp.baseStats.speed],
  ];
  for (const [k, v] of pairs) {
    const dt = document.createElement('dt');
    dt.textContent = k;
    const dd = document.createElement('dd');
    dd.textContent = String(v);
    stats.append(dt, dd);
  }

  (document.getElementById('detail-notes') as HTMLTextAreaElement).value = e.notes;
  updateStars(e.rating);
  renderGrid();
}

function updateStars(rating: number) {
  document.querySelectorAll('#stars button').forEach((btn) => {
    const r = Number((btn as HTMLButtonElement).dataset.rating);
    btn.classList.toggle('on', r <= rating && rating > 0);
  });
}

function setRating(rating: number) {
  if (!selectedId) return;
  const cur = entryFor(selectedId);
  const next = cur.rating === rating ? 0 : rating;
  feedback[selectedId] = {
    ...cur,
    rating: next,
    notes: cur.notes,
    updatedAt: new Date().toISOString(),
  };
  if (!feedback[selectedId].notes && feedback[selectedId].rating === 0) {
    delete feedback[selectedId];
  }
  saveFeedback();
  updateStars(next);
  renderGrid();
}

function setNotes(notes: string) {
  if (!selectedId) return;
  const cur = entryFor(selectedId);
  feedback[selectedId] = {
    rating: cur.rating,
    notes,
    updatedAt: new Date().toISOString(),
  };
  if (!notes.trim() && feedback[selectedId].rating === 0) {
    delete feedback[selectedId];
  }
  saveFeedback();
  renderGrid();
}

function exportPayload() {
  const items = SPECIES_LIST.map((sp) => {
    const e = entryFor(sp.id);
    return {
      id: sp.id,
      dexNumber: sp.dexNumber,
      name: sp.name,
      type: sp.types[0],
      archetype: pickArchetype(sp.name, hashString(sp.id)),
      stage: sp.stage,
      rating: e.rating || null,
      notes: e.notes || '',
      updatedAt: e.updatedAt || null,
    };
  }).filter((x) => x.rating || x.notes);

  return {
    exportedAt: new Date().toISOString(),
    game: 'Creature Catch',
    reviewedCount: items.length,
    totalCreatures: SPECIES_LIST.length,
    feedback: items,
  };
}

function wireUi() {
  populateFilters();

  for (const id of ['search', 'filter-type', 'filter-arch', 'filter-stage', 'filter-notes']) {
    document.getElementById(id)!.addEventListener('input', renderGrid);
    document.getElementById(id)!.addEventListener('change', renderGrid);
  }

  document.getElementById('stars')!.addEventListener('click', (ev) => {
    const t = (ev.target as HTMLElement).closest('button[data-rating]') as HTMLButtonElement | null;
    if (!t) return;
    setRating(Number(t.dataset.rating));
  });

  let notesTimer: number | undefined;
  document.getElementById('detail-notes')!.addEventListener('input', (ev) => {
    const value = (ev.target as HTMLTextAreaElement).value;
    window.clearTimeout(notesTimer);
    notesTimer = window.setTimeout(() => setNotes(value), 200);
  });

  document.getElementById('btn-export')!.addEventListener('click', () => {
    const payload = exportPayload();
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `creaturecatch-feedback-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast(`Exported ${payload.reviewedCount} notes`);
  });

  document.getElementById('btn-copy')!.addEventListener('click', async () => {
    const payload = exportPayload();
    await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
    toast(`Copied ${payload.reviewedCount} notes`);
  });

  document.getElementById('btn-clear')!.addEventListener('click', () => {
    if (!confirm('Clear all saved feedback notes on this device?')) return;
    feedback = {};
    saveFeedback();
    if (selectedId) selectCreature(selectedId);
    else renderGrid();
    toast('Feedback cleared');
  });
}

async function main() {
  const grid = document.getElementById('grid')!;
  grid.innerHTML = '<div class="empty">Baking creature sprites…</div>';
  try {
    await bakeSprites();
  } catch (err) {
    console.error(err);
    grid.innerHTML = '<div class="empty">Failed to render creatures. Check the console.</div>';
    return;
  }
  wireUi();
  renderGrid();
  // Open first creature for convenience
  if (SPECIES_LIST[0]) selectCreature(SPECIES_LIST[0].id);
}

main();
