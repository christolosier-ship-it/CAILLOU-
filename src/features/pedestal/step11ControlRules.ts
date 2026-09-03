const BLOCKING_MODE_CLASSES = [
  'is-caress-mode',
  'is-cleaning-mode',
  'is-placement-mode',
  'is-composition-settling',
] as const

export function shouldBlockStep11Controls(
  shellClassName: string,
  shopOpen: boolean,
  modalOpen: boolean,
  mutationLocked: boolean,
) {
  return shopOpen
    || modalOpen
    || mutationLocked
    || BLOCKING_MODE_CLASSES.some((token) => shellClassName.includes(token))
}
