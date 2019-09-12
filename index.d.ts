export default class TaskListsElement extends HTMLElement {
  disabled: boolean
  sortable: boolean
}

declare global {
  interface Window {
    TaskListsElement: TaskListsElement
  }
}
