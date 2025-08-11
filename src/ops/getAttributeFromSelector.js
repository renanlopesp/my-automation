function evalAttribute(el, attributeName) {
  return el.getAttribute(attributeName) ?? el?.[attributeName] ?? null
}

export async function getAttributeFromSelector(page, selector, attribute) {
  const results = await (
    await page.$$(selector)
  ).reduce(async (result, item) => {
    const resulted = await result
    const resolved = await item.evaluate(evalAttribute, attribute)
    resulted.push(resolved)
    return Promise.resolve(resulted)
  }, Promise.resolve([]))

  return results
}
