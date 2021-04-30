import pkg from './package.json'

export default {
  input: 'dist/task-lists-element.js',
  output: [
    {
      file: pkg['module'],
      format: 'es'
    }
  ]
}
