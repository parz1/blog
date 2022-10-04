import { parseISO, format } from 'date-fns'

export default function Dater({ dateString = undefined }) {
  if (dateString === undefined) {
    return <time dateTime={new Date().toISOString()}>{format(new Date(), 'LLLL d, yyyy')}</time>
  }
  const date = parseISO(dateString)
  return <time dateTime={dateString}>{format(date, 'LLLL d, yyyy')}</time>
}
