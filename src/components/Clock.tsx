import { createMemo, createSignal, onCleanup, onMount } from 'solid-js'
import { resolveTimeZone } from '../lib/time'
import { clock } from '../store/clock'
import { settings } from '../store/settings'

function greeting(hour: number): string {
  if (hour < 5) return 'GOOD NIGHT'
  if (hour < 12) return 'GOOD MORNING'
  if (hour < 18) return 'GOOD AFTERNOON'
  return 'GOOD EVENING'
}

export default function Clock() {
  const [tick, setTick] = createSignal(0)

  onMount(() => {
    const id = window.setInterval(() => setTick((count) => count + 1), 1000)
    onCleanup(() => window.clearInterval(id))
  })

  const timeZone = () => resolveTimeZone(settings.timeZone)

  const formatters = createMemo(() => {
    const zone = timeZone()
    return {
      time: new Intl.DateTimeFormat('en-GB', {
        timeZone: zone,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hourCycle: 'h23',
      }),
      date: new Intl.DateTimeFormat('en-GB', {
        timeZone: zone,
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
      hour: new Intl.DateTimeFormat('en-GB', {
        timeZone: zone,
        hour: '2-digit',
        hourCycle: 'h23',
      }),
    }
  })

  // Reading `tick()` subscribes this computation to the per-second update.
  const instant = () => {
    tick()
    return new Date(clock.now())
  }

  const time = () => formatters().time.format(instant())
  const date = () => formatters().date.format(instant()).toUpperCase()
  const hour = () => Number(formatters().hour.format(instant()))

  return (
    <div class="clock" role="timer" aria-label={`${time()} ${date()}`}>
      <div class="clock-time" aria-hidden="true">
        {time()}
      </div>
      <div class="clock-date" aria-hidden="true">
        {date()}
      </div>
      <div class="clock-greet" aria-hidden="true">
        {greeting(hour())}
      </div>
    </div>
  )
}
