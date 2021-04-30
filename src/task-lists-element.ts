import {SortEndArgs, isDragging, sortable} from './sortable'

const observers = new WeakMap()

export default class TaskListsElement extends HTMLElement {
  // eslint-disable-next-line custom-elements/no-constructor
  constructor() {
    super()

    this.addEventListener('change', (event: Event) => {
      const checkbox = event.target
      if (!(checkbox instanceof HTMLInputElement)) return
      if (!checkbox.classList.contains('task-list-item-checkbox')) return

      this.dispatchEvent(
        new CustomEvent('task-lists-check', {
          bubbles: true,
          detail: {
            position: position(checkbox),
            checked: checkbox.checked
          }
        })
      )
    })

    observers.set(this, new MutationObserver(syncState.bind(null, this)))
  }

  connectedCallback(): void {
    const observer = observers.get(this)
    if (observer) {
      observer.observe(this, {childList: true, subtree: true})
    }
    syncState(this)
  }

  disconnectedCallback(): void {
    const observer = observers.get(this)
    if (observer) {
      observer.disconnect()
    }
  }

  get disabled(): boolean {
    return this.hasAttribute('disabled')
  }

  set disabled(value: boolean) {
    if (value) {
      this.setAttribute('disabled', '')
    } else {
      this.removeAttribute('disabled')
    }
  }

  get sortable(): boolean {
    return this.hasAttribute('sortable')
  }

  set sortable(value: boolean) {
    if (value) {
      this.setAttribute('sortable', '')
    } else {
      this.removeAttribute('sortable')
    }
  }

  static get observedAttributes(): string[] {
    return ['disabled']
  }

  attributeChangedCallback(name: string, oldValue: string, newValue: string): void {
    if (oldValue === newValue) return

    switch (name) {
      case 'disabled':
        syncDisabled(this)
        break
    }
  }
}

const handleTemplate = document.createElement('template')
handleTemplate.innerHTML = `
  <span class="handle">
    <svg class="drag-handle" aria-hidden="true" width="16" height="16">
      <path d="M10 13a1 1 0 100-2 1 1 0 000 2zm-4 0a1 1 0 100-2 1 1 0 000 2zm1-5a1 1 0 11-2 0 1 1 0 012 0zm3 1a1 1 0 100-2 1 1 0 000 2zm1-5a1 1 0 11-2 0 1 1 0 012 0zM6 5a1 1 0 100-2 1 1 0 000 2z"/>
    </svg>
  </span>`

const initialized = new WeakMap()

// Only top-level lists are draggable, and nested lists drag with their parent item.
function initItem(el: HTMLElement) {
  if (initialized.get(el)) return
  initialized.set(el, true)

  const currentTaskList = el.closest('task-lists')
  if (!(currentTaskList instanceof TaskListsElement)) return

  // Single item task lists are not draggable.
  if (currentTaskList.querySelectorAll('li').length <= 1) return

  const fragment = handleTemplate.content.cloneNode(true)
  const handle = (fragment as DocumentFragment).querySelector<HTMLElement>('.handle')
  el.prepend(fragment)

  if (!handle) throw new Error('handle not found')
  handle.addEventListener('mouseenter', onHandleMouseOver)
  handle.addEventListener('mouseleave', onHandleMouseOut)

  sortable(el, onSortStart, onSorted)

  // Drag operations don't remove :hover styles, so manage drag handle hover state.
  el.addEventListener('mouseenter', onListItemMouseOver)
  el.addEventListener('mouseleave', onListItemMouseOut)
}

function onListItemMouseOver(event: MouseEvent) {
  const item = event.currentTarget
  if (!(item instanceof Element)) return

  const list = item.closest('task-lists')
  if (!(list instanceof TaskListsElement)) return

  if (list.sortable && !list.disabled) {
    item.classList.add('hovered')
  }
}

function onListItemMouseOut(event: MouseEvent) {
  const item = event.currentTarget
  if (!(item instanceof Element)) return
  item.classList.remove('hovered')
}

// Returns the list item position as a (list index, item index) tuple.
function position(checkbox: HTMLInputElement): [number, number] {
  const list = taskList(checkbox)
  if (!list) throw new Error('.contains-task-list not found')
  const item = checkbox.closest('li')
  const index = item ? Array.from(list.children).indexOf(item) : -1
  return [listIndex(list), index]
}

// Finds the list item's parent task list.
function taskList(el: Element): Element | null {
  const parent = el.parentElement
  return parent ? parent.closest('.contains-task-list') : null
}

// Is the task list this element belongs to a root list?
function isRootTaskList(el: Element): boolean {
  return taskList(el) === rootTaskList(el)
}

// Finds the highest task list in this element's ancestor chain.
function rootTaskList(node: Element): Element | null {
  const list = taskList(node)
  return list ? rootTaskList(list) || list : null
}

function syncState(list: TaskListsElement) {
  const items = list.querySelectorAll<HTMLElement>('.contains-task-list > li')
  for (const el of items) {
    if (isRootTaskList(el)) {
      initItem(el)
    }
  }
  syncDisabled(list)
}

function syncDisabled(list: TaskListsElement) {
  for (const el of list.querySelectorAll('li')) {
    el.classList.toggle('enabled', !list.disabled)
  }
  for (const el of list.querySelectorAll('.task-list-item-checkbox')) {
    if (el instanceof HTMLInputElement) {
      el.disabled = list.disabled
    }
  }
}

// Given a top-level task list, return its index location in the container. All
// lists in the container, not just task lists, are indexed to match the
// server-side Markdown parser's indexing.
function listIndex(list: Element): number {
  const container = list.closest('task-lists')
  if (!container) throw new Error('parent not found')
  return Array.from(container.querySelectorAll('ol, ul')).indexOf(list)
}

const originalLists = new WeakMap()

function onSortStart(srcList: Element) {
  const container = srcList.closest('task-lists')
  if (!container) throw new Error('parent not found')
  originalLists.set(container, Array.from(container.querySelectorAll('ol, ul')))
}

function onSorted({src, dst}: SortEndArgs) {
  const container = src.list.closest('task-lists')
  if (!container) return

  const lists = originalLists.get(container)
  if (!lists) return
  originalLists.delete(container)

  container.dispatchEvent(
    new CustomEvent('task-lists-move', {
      bubbles: true,
      detail: {
        src: [lists.indexOf(src.list), src.index],
        dst: [lists.indexOf(dst.list), dst.index]
      }
    })
  )
}

// Enable list item drag when handle is hovered.
function onHandleMouseOver(event: MouseEvent) {
  const target = event.currentTarget
  if (!(target instanceof Element)) return

  const item = target.closest('li')
  if (!item) return

  const list = item.closest('task-lists')
  if (!(list instanceof TaskListsElement)) return

  if (list.sortable && !list.disabled) {
    item.setAttribute('draggable', 'true')
  }
}

// Disable list item drag so text selection works.
function onHandleMouseOut(event: MouseEvent) {
  if (isDragging()) return

  const target = event.currentTarget
  if (!(target instanceof Element)) return

  const item = target.closest('li')
  if (!item) return

  item.setAttribute('draggable', 'false')
}

declare global {
  interface Window {
    TaskListsElement: typeof TaskListsElement
  }
  interface HTMLElementTagNameMap {
    'task-lists': TaskListsElement
  }
}

if (!window.customElements.get('task-lists')) {
  window.TaskListsElement = TaskListsElement
  window.customElements.define('task-lists', TaskListsElement)
}
