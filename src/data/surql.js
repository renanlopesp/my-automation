export function surql(template) {
  return template
    .flatMap(item => item.split('\n'))
    .join('')
    .trim()
}
