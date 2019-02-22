/* @flow strict */

import TaskListsElement from './task-lists-element'
export {TaskListsElement as default}

if (!window.customElements.get('task-lists')) {
  window.TaskListsElement = TaskListsElement
  window.customElements.define('task-lists', TaskListsElement)
}
