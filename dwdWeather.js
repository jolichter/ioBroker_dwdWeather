/*
V 24.03.015 Beta
Quelle: https://github.com/jolichter/ioBroker_dwdWeather

Verwende die API des Deutschen Wetterdienstes, um eine 10-Tage-Vorhersage aus der DWD-App (JSON-Daten)
und POI um stündliche Messdaten ausgewählter DWD-Wetterstationen (CSV-Daten) für ioBroker zu erhalten!

HINWEIS: Dieses Projekt ist ein privates Open-Source-Projekt und steht in keiner Verbindung zum Deutschen Wetterdienst.

Der folgende JavaScript-Code ermöglicht den regelmäßigen Abruf von Wetterdaten, die Erstellung oder Aktualisierung
entsprechender Datenpunkte und die Überwachung von Wertänderungen, um aktuelle und präzise Wetterinformationen
bereitzustellen. Dabei wird kontinuierlich auf Änderungen der Wetterdaten überwacht und nur die betroffenen
Datenpunkte werden aktualisiert, wenn sich die Werte tatsächlich geändert haben.

--- API ---

Für die API-Dokumentation und das Schema empfehle ich einen Besuch der folgenden Website: https://dwd.api.bund.dev/
Mithilfe des Parameters "stationIDs" (Stationskennung des DWD) können die Wettervorhersagen als JSON-Datensatz angefordert
werden. Eine Liste der DWD-Stationskennungen befindet sich im MOSMIX-Stationskatalog unter:
https://www.dwd.de/DE/leistungen/met_verfahren_mosmix/mosmix_stationskatalog.cfg

Beispielsweise hat Bitburg die Stationskennung 'N7075', und JSON-Daten können
über den folgenden Link abgerufen werden:
https://dwd.api.proxy.bund.dev/v30/stationOverviewExtended?stationIds=N7075

--- POI ---

Es ist mir kein Echtzeit-Wetterdatenservice des DWD bekannt. Falls jemand darüber informiert ist,
würde ich mich über entsprechende Informationen freuen. Jedoch sind Messdaten von ausgewählten
DWD-Wetterstationen verfügbar. Auf der Website https://opendata.dwd.de können zum Beispiel auch
Wetterdaten als CSV-Datei heruntergeladen werden, die stündlich aktualisiert werden.
Diese ausgewählten DWD-Wetterstationen sind auf der Stationskarte
https://www.dwd.de/DE/fachnutzer/landwirtschaft/appl/stationskarte/_node.html verzeichnet.
In der Nähe von Bitburg konnte ich die Station Olsdorf (ID 1964) finden. Laut MOSMIX-Stationskatalog
hat Olsdorf die ID K419. Es ist nicht notwendig, die verschiedenen IDs und Kennungen zu verstehen,
man muss nur wissen, wo sie zu finden sind ;-)

Unter https://opendata.dwd.de/weather/weather_reports/poi/ könnt ihr dann beispielsweise nach K419 suchen
und die passende Datei 'K419_-BEOB.csv' dazu finden. Der Parameter "stationIdentifiers" ist in diesem Fall also
'K419_-BEOB' (ohne Extension '.csv'). Zur Überprüfung könnt ihr die CSV-Datei über den folgenden Link aufrufen:
https://opendata.dwd.de/weather/weather_reports/poi/K419_-BEOB.csv

*/

// Variable zum Aktivieren/Deaktivieren der Logs (sollte bei ersten Versuchen aktiviert sein)
const enableLogs = false;

// Station-IDs (Array) für den Wetterdienst
// Du kannst beliebig viele Station-IDs hinzufügen, getrennt durch Kommas
// Beispiel IDs für Bitburg, Trier und Koeln/Bonn: ['N7075', '10609', '10513']
// deaktivieren mit: const stationIds = [];
// Ungenutzte Datenpunkte können manuell über die ioBroker-Admin-Oberfläche gelöscht werden
const stationIds = ['N7075'];

// Optionen zum Steuern der forecast1- und forecast2-Updates
const enableForecast1 = false;  // Setze auf "true", um forecast1 zu aktivieren
const enableForecast2 = false;  // Setze auf "true", um forecast2 zu aktivieren

// Variable zum Steuern des Aufteilens von Array-Werten (forecast1 und forecast2) in separate Datenpunkte
const splitArrays = false;  // Setze auf "true", um Array-Werte aufzuteilen

// Station-Identifiers (Array) für die stündlichen Messdaten (POI)
// z.B.: https://opendata.dwd.de/weather/weather_reports/poi/K419_-BEOB.csv -> Olsdorf (ID 1964) mit Stationskennung K419
// Beispiel: ['K419_-BEOB', 'Z908_-BEOB', '01271-BEOB']
// deaktivieren mit: const stationIdentifiers = [];
const stationIdentifiers = ['K419_-BEOB'];

// Variable für den fehlenden Wert in der CSV-Datei, wird im Datenpunkt als Wert "null" angezeigt
const missingValue = "---";

// Variable für die API-URL
const baseUrl = 'https://dwd.api.proxy.bund.dev/v30/stationOverviewExtended';
const urls = stationIds.map(stationId => `${baseUrl}?stationIds=${stationId}`);

// Variable für die CSV-URL (stündliche Messdaten)
const csvBaseUrl = 'https://opendata.dwd.de/weather/weather_reports/poi/';
const csvUrls = stationIdentifiers.map(stationIdentifier => `${csvBaseUrl}${stationIdentifier}.csv`);

// Node.js Modul 'axios' für HTTP-Anfragen
const axios = require('axios');

// Datenpunkt-Basis
const dpBase = 'javascript.0.dwdWeather';

// Prüft, ob ein Datenpunkt existiert und erstellt ihn ggf.
async function createStateIfNotExists(stateId, commonInfo) {
    if (!(await existsStateAsync(stateId))) {
        await createStateAsync(stateId, {
            type: 'mixed', // Typ als "mixed" festlegen, um verschiedene Typen von Werten zuzulassen
            common: commonInfo,
            native: {}
        });
    }
}

// Setzt einen Datenpunkt, wenn sich der Wert geändert hat
async function setStateIfChanged(stateId, value) {
    try {
        const currentState = await getStateAsync(stateId);
        if (currentState === null || currentState.val !== value) {
            setState(stateId, value);
        } else if (enableLogs) {
            log('Der Wert des Datenpunkts ' + stateId + ' hat sich nicht geändert.', 'debug');
        }
    } catch (error) {
        if (enableLogs) log('Fehler in setStateIfChanged bei Datenpunkt ' + stateId + ': ' + error, 'error');
    }
}

// Funktion zum Ersetzen von Komma durch Punkt in Zahlen-Strings
// Diese Lösung funktioniert nur, solange sichergestellt ist, dass Kommas ausschließlich als Dezimaltrennzeichen in den Zahlenwerten fungieren, nicht jedoch als Tausendertrennzeichen
function replaceCommaWithDot(value) {
    if (typeof value === 'string' && value.includes(',')) {
        return value.replace(',', '.');
    }
    return value;
}

// Funktion zum Konvertieren von Linux-Zeitformat in ISO-Datum
function convertToISODate(value) {
    if (typeof value === 'number' && value > 0) {
        const date = new Date(value);
        if (!isNaN(date)) {
            const options = { timeZone: 'Europe/Berlin', timeZoneName: 'short' };
            const localDateTime = date.toLocaleString('de-DE', options);
            return date.toISOString().split('T')[0] + ', ' + localDateTime.split(', ')[1];
        }
    }
    return value;
}

// Funktion zum Aktualisieren der Datenpunkte
async function updateDataPoints(dataPointBase, data) {
    for (const key in data) {
        const value = data[key];

        // Überprüfen, ob die Erstellung der Datenpunkte für forecast1 oder forecast2 aktiviert ist
        if ((dataPointBase.endsWith('forecast1') && !enableForecast1) ||
            (dataPointBase.endsWith('forecast2') && !enableForecast2)) {
            continue; // Weiter zur nächsten Iteration der Schleife
        }

        if (Array.isArray(value) && splitArrays) {
            for (let j = 0; j < value.length; j++) {
                const dataPoint = `${dataPointBase}.${key}.${j}`;
                await createStateIfNotExists(dataPoint, {
                    name: key + ' ' + j,
                    role: 'value',
                    type: typeof value[j],
                    read: true,
                    write: false
                });
                if (enableLogs) log('Updating data point ' + dataPoint + ' with value ' + value[j]);
                await setStateIfChanged(dataPoint, value[j]);
            }
        } else {
            const dataPoint = `${dataPointBase}.${key}`;
            if (['sunrise', 'sunset', 'moonrise', 'moonset'].includes(key)) {
                // Unixzeit wird in ISO-Datum formatiert
                const dateValue = convertToISODate(value);
                await createStateIfNotExists(dataPoint, {
                    name: key,
                    role: 'value',
                    type: 'string',
                    read: true,
                    write: false
                });
                if (enableLogs) log('Updating data point ' + dataPoint + ' with value ' + dateValue);
                await setStateIfChanged(dataPoint, dateValue);
            } else if (['start'].includes(key)) {
                // Unixzeit bei denen die Zeitreihe von Messwerten anfängt (wird in ISO-Datum formatiert)
                const dateValue = convertToISODate(value);
                await createStateIfNotExists(dataPoint, {
                    name: key,
                    role: 'value',
                    type: 'string',
                    read: true,
                    write: false
                });
                if (enableLogs) log('Updating data point ' + dataPoint + ' with value ' + dateValue);
                await setStateIfChanged(dataPoint, dateValue);
            } else {
                await createStateIfNotExists(dataPoint, {
                    name: key,
                    role: 'value',
                    type: typeof value,
                    read: true,
                    write: false
                });
                if (enableLogs) log('Updating data point ' + dataPoint + ' with value ' + value);
                await setStateIfChanged(dataPoint, value);
            }
        }
    }
}

// Funktion zum Formatieren des Datums in das ISO-Format (UTC-Zeit)
function formatDateToISO(date, time) {
    const [day, month, year] = date.split('.');
    const [hours, minutes] = time.split(':');
    const isoDate = new Date(Date.UTC(`20${year}`, month - 1, day, hours, minutes)).toISOString();
    return isoDate;
}

// TEST
// Funktion zum Umwandeln von UTC in das lokale Datumsformat
// function formatUTCtoLocal(dateTime) {
//  const localDateTime = new Date(dateTime).toLocaleString();
//  return localDateTime;
// }

// Funktion zum Umwandeln von UTC in das lokale Datumsformat im Format "YYYY-MM-DD HH:MM"
function formatUTCtoLocal(dateTime) {
    const date = new Date(dateTime);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const localDateTime = `${year}-${month}-${day} ${hours}:${minutes}`;
    return localDateTime;
}

// Funktion zum Aktualisieren der Wetterdaten
async function updateWeatherData() {
    if (!stationIds || stationIds.length === 0) {
        if (enableLogs) log("Keine Stations-IDs angegeben. Die Funktion updateWeatherData wird übersprungen.", "warn");
        return;
    }

    try {
        const promises = urls.map(url => axios.get(url));
        const responses = await Promise.all(promises);

        for (let i = 0; i < responses.length; i++) {
            const response = responses[i];
            const weatherData = response.data;
            const stationId = stationIds[i];

            if (weatherData.hasOwnProperty(stationId)) {
                // Update für forecast1
                await updateDataPoints(`${dpBase}.${stationId}.forecast1`, weatherData[stationId].forecast1);

                // Update für forecast2
                await updateDataPoints(`${dpBase}.${stationId}.forecast2`, weatherData[stationId].forecast2);

                // Update für days
                const days = weatherData[stationId].days;
                if (Array.isArray(days)) {
                    for (const day of days) {
                        await updateDataPoints(`${dpBase}.${stationId}.days.${days.indexOf(day)}`, day);
                    }
                } else {
                    if (enableLogs) log('Fehlerhafter JSON-Response für Station-ID ' + stationId + ': Keine Daten für "days" vorhanden oder ungültige Datenstruktur.', 'error');
                }
            } else {
                if (enableLogs) log('Fehlerhafter JSON-Response für Station-ID ' + stationId + ': Keine Daten für diese Station-ID vorhanden.', 'error');
            }
        }
    } catch (error) {
        if (enableLogs) log('Fehler in updateWeatherData: ' + error, 'error');
    }
}

// Mit der Funktion updateCurrentObservations werden die Werte aus Zeile 4 der CSV-Datei in Datenpunkte geschrieben.
// In Spalte A befindet sich das Datum (DD.MM.YY) und in Spalte B die Uhrzeit (HH:MM), die nur aus Zeile 4 extrahiert werden.
// Der Datenpunkt "DateTime" wird aus den Werten in Zeile 4, Spalte A und B erstellt und im ISO-Format (YYYY-MM-DD HH:MM) formatiert.
// Der Code überprüft, ob ein Wert in Zeile 4 den Wert missingValue hat. Wenn ja, wird eine Schleife gestartet, um in den folgenden Zeilen der gleichen Spalte nach dem ersten Wert zu suchen.
// Der erste gefundene Wert wird dann in den entsprechenden Datenpunkt eingetragen und die Suche in der Spalte wird beendet.
// Für jede Station im Array stationIdentifiers wird ein Alias erstellt und für die Erstellung der Datenpunkte verwendet (Datenpunktname mag keine Sonderzeichen).

// Funktion zum Aktualisieren der stündlichen Messdaten (aus CSV-Datei) und setzen eines Datenpunktes
async function updateCurrentObservations() {
    if (!stationIdentifiers || stationIdentifiers.length === 0) {
        if (enableLogs) log("Keine Stationskennungen angegeben. Die Funktion updateCurrentObservations wird übersprungen.", "warn");
        return;
    }

    try {
        for (let k = 0; k < stationIdentifiers.length; k++) {
            const stationIdentifier = stationIdentifiers[k];
            const stationIdentifierAlias = stationIdentifier.replace(/[^A-Za-z0-9]/g, "");
            const csvUrl = csvUrls[k];

            const response = await axios.get(csvUrl);
            if (response.status !== 200) {
                if (enableLogs) log(`CSV-Datei für die Stationskennung ${stationIdentifier} nicht gefunden. Die Funktion updateCurrentObservations wird übersprungen.`, "warn");
                continue;
            }

            const csvData = response.data;
            const lines = csvData.split("\n");
            const fieldNames = lines[2].split(";");
            const values = lines[3].split(";");

            const dateValue = values[0];
            const timeValue = values[1];

            const dateTimeValue = formatDateToISO(dateValue, timeValue);
            const localDateTimeValue = formatUTCtoLocal(dateTimeValue);

            const stationPath = `${dpBase}.${stationIdentifierAlias}`;

            const localDateTimePath = `${stationPath}.LocalDateTime`;
            await createStateIfNotExists(localDateTimePath, {
                name: "Datum und Uhrzeit (Lokal)",
                type: "string",
                role: "value.datetime",
                read: true,
                write: false
            });
            if (enableLogs) log(`Updating data point ${localDateTimePath} with value ${localDateTimeValue}`);
            await setStateIfChanged(localDateTimePath, localDateTimeValue);

            for (let i = 2; i < values.length; i++) {
                const fieldName = fieldNames[i].trim();
                let value = values[i];

                if (value === missingValue) {
                    for (let j = 4; j < lines.length; j++) {
                        const lineValues = lines[j].split(";");
                        const columnValue = lineValues[i];

                        if (columnValue !== missingValue) {
                            value = columnValue;
                            break;
                        }
                    }
                }

                // Kommas durch Punkte zu ersetzen (Update V 24.03.015 Beta)
                value = replaceCommaWithDot(value);

                let dataPointPath = `${stationPath}.${fieldName}`;
                // Leerzeichen durch einen Unterstrich (_) ersetzen, Sonderzeichen entfernen und Punkte (.) beibehalten
                dataPointPath = dataPointPath.replace(/\s/g, "_").replace(/[^A-Za-z0-9._]/g, "");

                if (enableLogs) log(`Updating data point ${dataPointPath} with value ${value}`);
                await createStateIfNotExists(dataPointPath, {
                    name: fieldName,
                    type: typeof value === "number" ? "number" : "string",
                    role: "value",
                    read: true,
                    write: false
                });
                await setStateIfChanged(dataPointPath, value);
            }
        }
    } catch (error) {
        if (enableLogs) log("Fehler in updateCurrentObservations: " + error, "error");
    }
}

// erster Start und Initialisierung
(async () => {
    try {
        // Funktion zum Aktualisieren der Wetterdaten aufrufen
        await updateWeatherData();
        // Funktion zum Aktualisieren der aktuellen Messdaten aufrufen
        await updateCurrentObservations();
    } catch (error) {
        if (enableLogs) log('Fehler beim Start oder Initialisierung: ' + error, 'error');
    }
})();


// Eventuell den Zeitplan nach Bedarf anpassen

// Mit diesem Zeitplan wird die Funktion stündlich gestartet, beginnend 5 Minuten nach jeder vollen Stunde.
schedule('5 0 * * * *', updateWeatherData);

// Mit diesem Zeitplan wird die Funktion stündlich gestartet, beginnend 50 Minuten nach jeder vollen Stunde.
// genaue Minuten siehe https://opendata.dwd.de/weather/weather_reports/poi/
schedule('50 0 * * * *', updateCurrentObservations);
