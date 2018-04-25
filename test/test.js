describe('task-lists element', function() {
  describe('element creation', function() {
    it('creates from document.createElement', function() {
      const el = document.createElement('task-lists')
      assert.equal('TASK-LISTS', el.nodeName)
      assert(el instanceof window.TaskListsElement)
    })

    it('creates from constructor', function() {
      const el = new window.TaskListsElement()
      assert.equal('TASK-LISTS', el.nodeName)
    })
  })
})
