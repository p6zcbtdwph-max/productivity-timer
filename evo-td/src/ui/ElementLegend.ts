/** Statische Legende der Gegner-Elemente. */
import { BALANCE } from '../config/balance';
import { ELEMENT_IDS, getElementDef } from '../data/elements';
import { $, el } from './dom';

export class ElementLegend {
  constructor() {
    const root = $('#element-legend');
    const list = el('ul', { className: 'legend' });
    for (const id of ELEMENT_IDS) {
      const def = getElementDef(id);
      list.append(
        el('li', {}, [
          el('span', { className: 'swatch', style: `background:${def.color}` }),
          ` ${def.name}: `,
          el('span', { className: 'muted' }, [def.description]),
        ]),
      );
    }
    root.replaceChildren(
      el('h2', {}, ['Roboter-Elemente']),
      el('p', { className: 'muted small' }, [`Ab Welle ${BALANCE.elements.fromWave}, mit steigender Wahrscheinlichkeit.`]),
      list,
    );
  }
}
