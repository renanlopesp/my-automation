function evalAttribute(el, attributeName) {
  return el.getAttribute(attributeName) ?? el?.[attributeName] ?? null
}

export async function getAttributeFromSelector(page, selector, attribute) {
  const elements = await page.locator(selector).all()
  const results = await elements.reduce(async (result, item) => {
    const resulted = await result
    const resolved = await item.evaluate(evalAttribute, attribute)
    resulted.push(resolved)
    return Promise.resolve(resulted)
  }, Promise.resolve([]))

  return results
}
