describe('task-lists element', function () {
  describe('element creation', function () {
    it('creates from document.createElement', function () {
      const el = document.createElement('task-lists')
      assert.equal('TASK-LISTS', el.nodeName)
      assert(el instanceof window.TaskListsElement)
    })

    it('creates from constructor', function () {
      const el = new window.TaskListsElement()
      assert.equal('TASK-LISTS', el.nodeName)
    })
  })

  describe('selecting checkboxes', function () {
    beforeEach(function () {
      const container = document.createElement('div')
      container.innerHTML = `
        <task-lists>
          <ul class="contains-task-list">
            <li>
              <input type="checkbox"> Hubot
            </li>
            <li>
              <input type="checkbox"> Bender
            </li>
          </ul>

          <ul class="contains-task-list">
            <li>
              <input type="checkbox"> BB-8
            </li>
            <li>
              <input id="wall-e" type="checkbox"> WALL-E
            </li>
          </ul>

          <ol>
            <li>
              Nested
              <ul class="contains-task-list">
                <li>
                  <label>
                    <input type="checkbox">
                    R2-D2
                  </label>

                  <ul class="contains-task-list">
                    <li>
                      <label>
                        <input id="baymax" type="checkbox">
                        Baymax
                      </label>
                    </li>
                  </ul>
                </li>
              </ul>
            </li>
          </ol>
        </task-lists>`
      document.body.append(container)
    })

    afterEach(function () {
      document.body.innerHTML = ''
    })

    it('emits check event with position', function () {
      let called = false

      const list = document.querySelector('task-lists')
      list.addEventListener('task-lists-check', function (event) {
        called = true
        const {position, checked} = event.detail
        assert.deepEqual(position, [1, 1])
        assert(checked)
      })

      const checkbox = document.querySelector('#wall-e')
      checkbox.checked = true
      checkbox.dispatchEvent(new CustomEvent('change', {bubbles: true}))

      assert(called)
    })

    it('emits check event with the right position for nested task list item', function () {
      let called = false

      const list = document.querySelector('task-lists')
      list.addEventListener('task-lists-check', function (event) {
        called = true
        const {position, checked} = event.detail
        assert.deepEqual(position, [4, 0])
        assert(checked)
      })

      const checkbox = document.querySelector('#baymax')
      checkbox.checked = true
      checkbox.dispatchEvent(new CustomEvent('change', {bubbles: true}))

      assert(called)
    })
  })
})
