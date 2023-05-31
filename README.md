# ioBroker_dwdWeather

## DWD Wettervorhersage und stündliche Messdaten für [ioBroker](https://github.com/ioBroker)

#### Dieser JavaScript lädt die Wetterdaten vom deutschen Wetterdienst über JSON- bzw. CSV-Links.

![DWD-Logo](https://github.com/jolichter/ioBroker_dwdWeather/assets/1485851/298f1285-aee6-4f08-97b7-d5a3865177ae)

#### Der JavaScript-Code in ioBroker verwendet einen JSON-Datensatz von der API des Deutschen Wetterdienstes https://dwd.api.bund.dev, um automatisch entsprechende Datenpunkte für eine Wettervorhersage zu erstellen. Ebenso können stündliche Messdaten (POI) über https://opendata.dwd.de (CSV-Datei) geladen werden und entsprechende Datenpunkte werden erstellt. Durch die regelmäßige Aktualisierung der Datenpunkte bleiben die Informationen stets auf dem neuesten Stand. Dies ermöglicht eine einfache Integration der Wetterdaten in Visualisierungen und Automatisierungen innerhalb von ioBroker.

Folgende Funktionen und Optionen sind im Code enthalten:

- Der Code verwendet das Node.js-Modul 'axios' für HTTP-Anfragen.
- Variable enableLogs ermöglicht das Aktivieren oder Deaktivieren von Logs, die Informationen über den Skriptablauf liefern.
- Variable stationIds enthält eine Liste von Station-IDs für den Wetterdienst. Hier können beliebig viele Station-IDs hinzugefügt werden, getrennt durch Kommas.
- Variable stationIdentifiers ist für die Stationskennung (wenn bekannt, stündliche Messdaten von DWD Wetterstationen). Es können beliebig viele Station-Identifiers hinzugefügt werden, getrennt durch Kommas.
- Die Optionen enableForecast1 und enableForecast2 steuern das Aktualisieren der Datenpunkte für forecast1 und forecast2. Du kannst sie auf true setzen, um die entsprechenden Datenpunkte zu aktivieren.
- Variable splitArrays steuert das Aufteilen von Array-Werten in separate Datenpunkte (nur forecast1 und forecast2). Bei Bedarf können Array-Werte auf diese Weise aufgeteilt werden.
- Die Funktionen createStateIfNotExists() und setStateIfChanged() werden verwendet, um Datenpunkte zu erstellen und ihre Werte zu aktualisieren, wenn sich die Werte geändert haben.
- Die Funktion convertToISODate() wird genutzt, um Linux-Zeitformate in das ISO-Datumformat zu konvertieren, insbesondere für die Werte "sunrise", "sunset", "moonrise" und "moonset".
- Die Funktionen updateDataPoints() und updateWeatherData() aktualisieren die Datenpunkte anhand der abgerufenen Wetterdaten. Dabei werden sowohl die Vorhersagen (forecast1 und forecast2) als auch die Tagesdaten aktualisiert.
- Der Code enthält eine Funktion updateCurrentObservations(), die die aktuellen Messdaten aus einer CSV-Datei aktualisiert, sofern eine Stationskennung angegeben ist. Hierbei werden die stündlichen Messdaten aus der CSV-Datei extrahiert und in entsprechende Datenpunkte geschrieben.
- Es werden regelmäßige Aktualisierungen der Wetterdaten und aktuellen Messdaten geplant.

Bitte beachte, dass es sich um eine Beta-Version handelt, was bedeutet, dass weitere Verbesserungen und Anpassungen möglich und erforderlich sein können. Das Skript kann als Ausgangspunkt für weitere Entwicklungen und Anpassungen dienen, um zusätzliche Funktionen hinzuzufügen oder spezifische Anforderungen zu erfüllen.

PS: Mir ist kein Echtzeit-Wetterdatenservice des DWD bekannt. Falls jemand darüber Bescheid weiß, würde ich mich über eine entsprechende Information freuen.

Datenpunkte DWD-API
![dwdDatenpunkte-API](https://github.com/jolichter/ioBroker_dwdWeather/assets/1485851/96b605af-9376-48d7-ba0b-f7f4d2c15875)

Datenpunkte DVD-POI
![dwdDatenpunkte-POI](https://github.com/jolichter/ioBroker_dwdWeather/assets/1485851/fecbcb0a-5c58-4283-b489-37529f4f6e51)

## Lizenz
Dieses Projekt ist unter der [MIT-Lizenz](LICENSE.md) lizenziert. Weitere Informationen finden Ihr in der [Lizenzdatei](LICENSE.md).
