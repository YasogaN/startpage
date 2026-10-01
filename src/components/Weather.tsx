import { Show } from 'solid-js'
import { weatherGlyph } from '../lib/weather'
import { settings } from '../store/settings'
import { statusLabel, weather } from '../store/weather'

export default function Weather() {
  return (
    <Show when={settings.weather.enabled}>
      <div class="weather" role="status" aria-live="polite">
        <Show
          when={weather.data()}
          fallback={
            <span class="weather-status">{statusLabel(weather.status())}</span>
          }
        >
          {(data) => (
            <span class="weather-now">
              <span class="weather-glyph" aria-hidden="true">
                {weatherGlyph(data().code, data().isDay)}
              </span>
              <span class="weather-temp">
                {data().temperature}°{data().unit === 'celsius' ? 'C' : 'F'}
              </span>
              <span class="weather-desc">{data().description}</span>
              <span class="weather-extra">
                FEELS {data().apparentTemperature}° · WIND {data().windSpeed}{' '}
                KM/H
              </span>
              <Show when={settings.weather.label}>
                <span class="weather-place">{settings.weather.label}</span>
              </Show>
            </span>
          )}
        </Show>
      </div>
    </Show>
  )
}
