import test from 'node:test';
import assert from 'node:assert/strict';
import { decorativeSnapshotHtml } from '../src/lib/decorative-snapshot.ts';

// Minimal detached DOM fixture: exercise the production transformation without
// starting a browser, installing a service worker or adding a DOM dependency.
class FixtureElement {
  readonly tag: string;
  readonly attrs: Record<string, string>;
  readonly children: FixtureElement[];
  readonly text: string;
  constructor(tag: string, attrs: Record<string, string> = {}, children: FixtureElement[] = [], text = '') {
    this.tag = tag; this.attrs = attrs; this.children = children; this.text = text;
  }
  cloneNode(): FixtureElement { return new FixtureElement(this.tag, { ...this.attrs }, this.children.map(child => child.cloneNode()), this.text); }
  querySelectorAll(): FixtureElement[] { return this.children.flatMap(child => [child, ...child.querySelectorAll()]); }
  removeAttribute(name: string) { delete this.attrs[name]; }
  setAttribute(name: string, value: string) { this.attrs[name] = value; }
  matches() { return ['a', 'button', 'input', 'select', 'textarea'].includes(this.tag) || 'tabindex' in this.attrs || 'contenteditable' in this.attrs; }
  get innerHTML(): string { return this.text + this.children.map(child => `<${child.tag}${Object.entries(child.attrs).map(([key, value]) => ` ${key}="${value}"`).join('')}>${child.innerHTML}</${child.tag}>`).join(''); }
}

test('decorative copy drops identities and focus targets without changing the live draft or styles', () => {
  const original = new FixtureElement('div', {}, [
    new FixtureElement('form', { id: 'order-form', name: 'order' }, [
      new FixtureElement('label', { for: 'buyer', class: 'visible-label' }, [], 'Nome'),
      new FixtureElement('input', { id: 'buyer', name: 'buyer', value: 'Rascunho fictício', autofocus: '', 'aria-describedby': 'help', class: 'input-style' }),
      new FixtureElement('p', { id: 'help' }, [], 'Explicação'),
      new FixtureElement('button', { type: 'submit', form: 'order-form' }, [], 'Salvar'),
      new FixtureElement('button', { 'aria-controls': 'options', 'aria-labelledby': 'buyer-label', 'aria-activedescendant': 'option-1', tabindex: '0' }, [], 'Opções'),
    ]),
  ]);
  const liveBefore = original.innerHTML;
  const snapshot = decorativeSnapshotHtml(original as unknown as HTMLElement);
  assert.equal(original.innerHTML, liveBefore);
  assert.doesNotMatch(snapshot, /\s(?:id|name|for|form|autofocus|aria-describedby|aria-controls|aria-labelledby|aria-activedescendant)=/);
  assert.match(snapshot, /value="Rascunho fictício"/);
  assert.match(snapshot, /class="input-style"/);
  assert.match(snapshot, /class="visible-label"/);
  assert.equal((snapshot.match(/tabindex="-1"/g) || []).length, 3);
});
