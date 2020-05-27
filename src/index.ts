import TaskListsElement from './task-lists-element'
export {TaskListsElement as default}

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
