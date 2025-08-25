import { useState, useEffect, useRef } from 'react';

// Główny komponent aplikacji
const App = () => {
  // Mapa indeksów miesięcy (z JavaScript Date) na polskie nazwy
  const monthIndexToName = {
    8: 'Wrzesień',
    9: 'Październik',
    10: 'Listopad',
    11: 'Grudzień',
    0: 'Styczeń',
    1: 'Luty',
    2: 'Marzec',
    3: 'Kwiecień',
    4: 'Maj',
    5: 'Czerwiec',
  };
  
  // NOWA TABLICA Z POPRAWNĄ KOLEJNOŚCIĄ MIESIĘCY
  const orderedMonths = [
    'Wrzesień',
    'Październik',
    'Listopad',
    'Grudzień',
    'Styczeń',
    'Luty',
    'Marzec',
    'Kwiecień',
    'Maj',
    'Czerwiec',
  ];

  // Funkcja, która ustala domyślny miesiąc na podstawie bieżącej daty
  const getDefaultMonth = () => {
    const currentMonthIndex = new Date().getMonth();
    // Zwróć polską nazwę miesiąca lub 'Wrzesień' jako wartość domyślną, jeśli nie ma dopasowania
    return monthIndexToName[currentMonthIndex] || 'Wrzesień';
  };
  
  // Stan do zarządzania widokami i danymi
  const [screen, setScreen] = useState('home');
  const [selectedUser, setSelectedUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [allUsers, setAllUsers] = useState([]); // Przechowuje wszystkich użytkowników, niezależnie od dnia
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [selectedFilter, setSelectedFilter] = useState('');
  const [selectedColumn, setSelectedColumn] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  // Stan do przechowywania surowych danych z arkusza
  const [rawSheetData, setRawSheetData] = useState([]);
  // Stan do przechowywania nagłówków kolumn z arkusza
  const [columnHeaders, setColumnHeaders] = useState([]);
  // Stan do przechowywania wybranego dnia tygodnia
  const [selectedDay, setSelectedDay] = useState('');
  const [attendanceMessage, setAttendanceMessage] = useState(null);
  // Przechowuje czasy ostatniego kliknięcia dla KAŻDEGO użytkownika
  const [userCooldowns, setUserCooldowns] = useState({});
  // Stan dla zapytania wyszukiwania
  const [searchQuery, setSearchQuery] = useState('');
  // NOWY STAN: Wartość wyszukiwania po odczekaniu (debouncing)
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  // Nowa referencja dla dodawania uczestnika spoza bazy
  const newParticipantRef = useRef(null);
  // Nowy stan do kontrolowania widoczności formularza dodawania uczestnika
  const [showAddParticipantForm, setShowAddParticipantForm] = useState(false);
  // Przechowuje wybrany miesiąc do sprawdzania abonamentu
  const [selectedMonth, setSelectedMonth] = useState(getDefaultMonth());
  // Przechowuje timery dla obecności, które czekają na zapis
  const [pendingAttendanceTimers, setPendingAttendanceTimers] = useState({});
  // ZMIANA: Przechowuje status obecności dla konkretnej sesji (Dzień, Zajęcia, Grupa)
  // Teraz obiekt przechowuje również znacznik czasu (timestamp)
  const [sessionAttendanceStatus, setSessionAttendanceStatus] = useState(() => {
    try {
      // Ładuje status obecności z localStorage przy pierwszym renderowaniu
      const storedStatus = localStorage.getItem('sessionAttendanceStatus');
      return storedStatus ? JSON.parse(storedStatus) : {};
    } catch (error) {
      console.error("Failed to load attendance status from localStorage:", error);
      return {};
    }
  });

  // NOWY STAN: Przechowuje podświetlone sesje w localStorage, wraz z czasem ich podświetlenia
  const [sessionHighlights, setSessionHighlights] = useState(() => {
    try {
      const storedHighlights = localStorage.getItem('sessionHighlights');
      return storedHighlights ? JSON.parse(storedHighlights) : {};
    } catch (error) {
      console.error("Failed to load session highlights from localStorage:", error);
      return {};
    }
  });
  
  // Dane do połączenia z Google Sheets API.
  const apiKey = "AIzaSyBc3EW9VROqSoe87TP8BLkddM5Vr4BqEJg";
  const sheetId = "1SrX4suFX64c-S6qlqGT5vfY4UW8FQjCy7X9PzoXtKKI";
  const appsScriptUrl = "https://script.google.com/macros/s/AKfycbzpCiPB4gKCnQiDg1ZUot5H_HBUrFYn6j0phHBkEtJa0-kcnX4nH4cw_G_PUphlQpNCg/exec";
  const proxyScriptUrl = "https://script.google.com/macros/s/AKfycbyAtlYdp9ImSRHELyJfdC2yVZUREM1JdW50V0ZKlTQG0jSgsW3d4sA1w9WuSVUAVOUAiQ/exec"; 
  
  // Zaktualizowany zakres danych obejmujący Poniedziałek, Wtorek, Środa, Czwartek, Piątek, Sobota i Niedzielę
  // WAŻNA ZMIANA: Zakres danych został rozszerzony do kolumny BH, aby uwzględnić wszystkie miesiące
  const range = "Baza danych!A:BH"; 

  // Mapowanie dni tygodnia na zakresy indeksów kolumn, włącznie z indeksem dla kolumny z nazwiskami
  const dayRanges = {
    'Poniedziałek': { nameIndex: 0, dataRange: [1, 6] },
    'Wtorek': { nameIndex: 0, dataRange: [8, 13] },
    'Środa': { nameIndex: 0, dataRange: [15, 20] },
    'Czwartek': { nameIndex: 0, dataRange: [22, 27] },
    'Piątek': { nameIndex: 0, dataRange: [29, 34] },
    'Sobota': { nameIndex: 0, dataRange: [36, 41] },
    'Niedziela': { nameIndex: 0, dataRange: [43, 46] },
  };

  // Mapa miesięcy i ich kolumn, podana przez Ciebie
  const monthColumns = {
    'Wrzesień': 'AY',
    'Październik': 'AZ',
    'Listopad': 'BA',
    'Grudzień': 'BB',
    'Styczeń': 'BC',
    'Luty': 'BD',
    'Marzec': 'BE',
    'Kwiecień': 'BF',
    'Maj': 'BG',
    'Czerwiec': 'BH',
  };

  // Funkcja pobierająca dane z Google Sheets API
  const fetchSheetData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}?key=${apiKey}`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.error) {
        setError(`Błąd API: ${data.error.message}. Sprawdź, czy klucz API ma uprawnienia do Google Sheets API i czy arkusz jest publicznie dostępny.`);
      } else if (data.values && data.values.length > 0) {
        // Zapisz surowe dane
        setRawSheetData(data.values);
      } else {
        setError("Błąd podczas ładowania danych. Upewnij się, że ID arkusza i klucz API są poprawny oraz że arkusz nie jest pusty.");
      }
    } catch (err) {
      console.error("Nie udało się pobrać danych:", err);
      setError("Nie udało się pobrać danych. Sprawdź połączenie z internetem lub klucz API.");
    } finally {
      setIsLoading(false);
    }
  };

  // Użyj useEffect, aby pobrać dane tylko raz po załadowaniu komponentu
  useEffect(() => {
    fetchSheetData();
  }, []);

  // NOWA FUNKCJA: Przetwarza dane użytkowników dla wybranego dnia
  const processDataForDay = () => {
    if (!rawSheetData.length || !selectedDay || !dayRanges[selectedDay]) {
      setUsers([]);
      setColumnHeaders([]);
      return;
    }

    const { nameIndex, dataRange } = dayRanges[selectedDay];
    const headers = rawSheetData[0].slice(dataRange[0], dataRange[1] + 1);
    setColumnHeaders(headers);

    const rows = rawSheetData.slice(1);
    const parsedUsers = rows.map((row, index) => {
      const user = {
        // Ważne: ID jest teraz zawsze oparte na indeksie wiersza w surowych danych
        id: index, 
        name: row[nameIndex] || '',
        rowData: row // Dodaj cały wiersz danych, aby móc go użyć później
      };
      headers.forEach((header, colIndex) => {
        user[header] = row[dataRange[0] + colIndex] || '';
      });
      return user;
    }).filter(user => {
      // Sprawdź, czy użytkownik ma imię ORAZ czy ma jakieś dane dla wybranego dnia
      const hasName = user.name.trim() !== '';
      const hasDataForDay = headers.some(header => user[header] && user[header].trim() !== '');
      return hasName && hasDataForDay;
    });

    setUsers(parsedUsers);
  };
  
  // NOWA FUNKCJA: Przetwarza wszystkich użytkowników z kolumny A
  const processAllUsers = () => {
    if (!rawSheetData.length) {
      setAllUsers([]);
      return;
    }
    
    const allParsedUsers = [];
    const nameColumnIndex = 0; 

    const rows = rawSheetData.slice(1);
    rows.forEach((row, index) => {
      const name = row[nameColumnIndex];
      if (name && name.trim() !== '') {
        // Ważne: ID jest teraz zawsze oparte na indeksie wiersza w surowych danych
        allParsedUsers.push({
          id: index, 
          name: name,
          rowData: row
        });
      }
    });
    
    setAllUsers(allParsedUsers);
  };

  // Użyj useEffect, aby przetworzyć dane, gdy zmieni się dzień lub surowe dane
  useEffect(() => {
    if(selectedDay) {
        processDataForDay();
    }
    processAllUsers();
  }, [rawSheetData, selectedDay]);

  // NOWA LOGIKA: Debouncing wyszukiwania
  useEffect(() => {
    // Ustaw timer, który zaktualizuje debouncedSearchQuery po 300 ms
    const timerId = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);

    // Funkcja czyszcząca - uruchamiana przy każdym kolejnym wciśnięciu klawisza lub odmontowaniu
    return () => {
      clearTimeout(timerId);
    };
  }, [searchQuery]); // Efekt uruchamia się przy każdej zmianie searchQuery

  // OBSŁUGA FILTROWANIA: Wyszukiwanie ma najwyższy priorytet
  useEffect(() => {
    let tempFilteredUsers = [];
    
    // Jeśli jest zapytanie wyszukiwania, przeszukuj całą bazę (`allUsers`)
    if (debouncedSearchQuery) {
      tempFilteredUsers = allUsers.filter(user =>
        user.name.toLowerCase().includes(debouncedSearchQuery.toLowerCase())
      );
    } else if (selectedColumn && selectedFilter) {
      // Jeśli wybrano grupę i zajęcia, filtruj na podstawie tych wartości
      tempFilteredUsers = users.filter(user =>
        user[selectedColumn] && user[selectedColumn].split(',').map(s => s.trim()).includes(selectedFilter)
      );
    } else {
        // Jeśli nie ma wyszukiwania ani wybranej grupy, lista jest pusta
        tempFilteredUsers = [];
    }
    
    setFilteredUsers(tempFilteredUsers);
  }, [debouncedSearchQuery, selectedDay, selectedColumn, selectedFilter, users, allUsers]);

  // Funkcja do obsługi zmiany w polu wyszukiwania
  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
    // Wyczyść stan filtrów i obecności, aby uniknąć błędnego wyświetlania po zmianie trybu na wyszukiwanie
    setSelectedColumn('');
    setSelectedFilter('');
  };

  // Obsługa zmiany w liście rozwijanej grupy
  const handleFilterChange = (event) => {
    setSelectedFilter(event.target.value);
    setShowAddParticipantForm(false);
    setSearchQuery(''); 
  };

  // Obsługa zmiany w liście rozwijanej zajęć
  const handleColumnChange = (event) => {
    setSelectedColumn(event.target.value);
    setSelectedFilter('');
    setShowAddParticipantForm(false);
    setSearchQuery('');
  };

  // Obsługa zmiany w liście rozwijanej dnia
  const handleDayChange = (event) => {
    setSelectedDay(event.target.value);
    setSelectedColumn('');
    setSelectedFilter('');
    setShowAddParticipantForm(false);
    setSearchQuery('');
  };

  // Zaktualizowana funkcja pobierająca unikalne wartości dla drugiej listy rozwijanej
  const getFilterOptions = (column) => {
    if (!column || !users.length) return [];
    const options = new Set();
    users.forEach(user => {
      const cellValue = user[column];
      if (cellValue) {
        // Podziel wartość komórki po przecinku i dodaj każdy symbol oddzielnie
        cellValue.split(',').forEach(symbol => {
          const trimmedSymbol = symbol.trim();
          if (trimmedSymbol) {
            options.add(trimmedSymbol);
          }
        });
      }
    });
    return [...options];
  };

  // Funkcja pobierająca nagłówki kolumn, które mają jakieś dane dla wybranego dnia
  const getNonEmptyHeadersForSelectedDay = () => {
    return columnHeaders.filter(header => {
      return users.some(user => user[header] && user[header].trim() !== '');
    });
  };
  
  // Funkcja do zwracania koloru w zależności od pierwszej litery symbolu
  const getBackgroundColor = (symbol) => {
    const firstLetter = symbol.trim().charAt(0).toUpperCase();
    switch (firstLetter) {
      case 'F':
        return 'bg-purple-500'; // Fioletowy
      case 'N':
        return 'bg-blue-500'; // Niebieski
      case 'Z':
        return 'bg-green-500'; // Zielony
      case 'P':
        return 'bg-transparent'; // Neutralny, bez tła
      default:
        return 'bg-yellow-400'; // Żółty dla pozostałych
    }
  };

  // Sprawdzanie statusu abonamentu - przeniesione do osobnej funkcji
  const getSubscriptionStatus = (user) => {
      const userRow = rawSheetData[user.id + 1];
      const headerRow = rawSheetData[0];
      
      const columnIndex = headerRow.indexOf(selectedMonth);

      if (columnIndex === -1 || !userRow || !userRow[columnIndex] || userRow[columnIndex].trim() === '') {
        return { status: 'Brak abonamentu', color: 'text-red-500', bgColor: 'bg-gray-200' };
      }

      const subscriptionValue = userRow[columnIndex].trim();
      if (subscriptionValue !== '') {
        return { status: 'Aktywny', color: 'text-green-600', bgColor: 'bg-green-200' };
      }

      return { status: 'Brak abonamentu', color: 'text-red-500', bgColor: 'bg-gray-200' };
    };

  // Zmieniona funkcja - teraz przyjmuje użytkownika jako argument
  const recordAttendance = (user) => {
    if (!user) {
      setAttendanceMessage({ type: 'error', text: 'Błąd: Uczestnik nie jest wybrany.' });
      return;
    }
    
    // ZMIANA: Tworzymy unikalny klucz na podstawie ID, dnia, zajęć i grupy
    const attendanceKey = `${user.id}-${selectedDay}-${selectedColumn}-${selectedFilter}`;
    const isPending = pendingAttendanceTimers[user.id];
    
    if (isPending) {
      // 2) Jeśli kliknięto ponownie w ciągu 5 sekund, anuluj wysyłanie
      clearTimeout(isPending);
      setPendingAttendanceTimers(prev => {
        const newTimers = { ...prev };
        delete newTimers[user.id];
        return newTimers;
      });
      setAttendanceMessage({ type: 'info', text: `Zapis obecności dla ${user.name} został anulowany.` });
    } else {
      // 1) Kliknięcie od razu wywołuje status "Obecny" i rozpoczyna 5-sekundowe odliczanie
      setAttendanceMessage({ type: 'success', text: `Obecność dla ${user.name} zostanie zapisana za 5 sekund.` });
      
      const timerId = setTimeout(async () => {
        // 3) Jeśli w ciągu 5 sekund nie nastąpi ponowne kliknięcie, wyślij dane
        
        const now = new Date().getTime();
        const searchMarker = debouncedSearchQuery ? 'Wyszukano' : '';
        const dataToSave = [
          user.name,
          selectedDay,
          selectedColumn,
          selectedFilter,
          searchMarker,
          new Date().toISOString()
        ];
        
        try {
          const url = `${proxyScriptUrl}?url=${encodeURIComponent(appsScriptUrl)}&data=${encodeURIComponent(JSON.stringify(dataToSave))}`;
          const response = await fetch(url);
          if (!response.ok) {
            const errorText = await response.text();
            console.error('Błąd zapisu obecności:', errorText);
            setAttendanceMessage({ type: 'error', text: `Nie udało się zapisać obecności. Kod błędu: ${response.status}. Szczegóły: ${errorText}.` });
          } else {
            // ZMIANA: Zapisz stan obecności dla Dnia, Zajęć i Grupy
            // Zapisz obiekt z flagą statusu i znacznikiem czasu
            setAttendanceMessage({ type: 'success', text: `Obecność dla ${user.name} została zapisana!` });
            setSessionAttendanceStatus(prev => ({
              ...prev,
              [attendanceKey]: { status: true, timestamp: now },
            }));
          }
        } catch (error) {
          console.error('Błąd zapisu obecności:', error);
          setAttendanceMessage({ type: 'error', text: 'Wystąpił błąd podczas zapisywania obecności. Sprawdź połączenie z internetem.' });
        } finally {
          setPendingAttendanceTimers(prev => {
            const newTimers = { ...prev };
            delete newTimers[user.id];
            return newTimers;
          });
        }
      }, 5000); // 5 sekund
      
      setPendingAttendanceTimers(prev => ({ ...prev, [user.id]: timerId }));
    }
  };

  // Nowa funkcja do dodawania nowego uczestnika spoza bazy
  const recordNewParticipantAttendance = async () => {
    // Pobierz wartość z referencji
    const newParticipantName = newParticipantRef.current.value.trim();
    if (!newParticipantName) {
      setAttendanceMessage({ type: 'error', text: 'Wpisz imię i nazwisko nowego uczestnika.' });
      return;
    }
    
    // Upewnij się, że wybrano dzień, zajęcia i grupę
    if (!selectedDay || !selectedColumn || !selectedFilter) {
      setAttendanceMessage({ type: 'error', text: 'Musisz wybrać Dzień, Zajęcia i Grupę.' });
      return;
    }

    const dataToSave = [
      newParticipantName,
      selectedDay,
      selectedColumn,
      selectedFilter,
      'NOWY', // Specjalny znacznik
      new Date().toISOString()
    ];
    
    try {
      // Wyświetl natychmiastowy komunikat o sukcesie
      setAttendanceMessage({ type: 'success', text: `Obecność dla ${newParticipantName} została zapisana!` });
      
      const url = `${proxyScriptUrl}?url=${encodeURIComponent(appsScriptUrl)}&data=${encodeURIComponent(JSON.stringify(dataToSave))}`;
      fetch(url)
        .then(response => {
          if (!response.ok) {
            response.text().then(errorText => {
              console.error('Błąd zapisu obecności:', errorText);
              setAttendanceMessage({ type: 'error', text: `Nie udało się zapisać obecności. Kod błędu: ${response.status}. Szczegóły: ${errorText}.` });
            });
          } else {
            newParticipantRef.current.value = ''; // Wyczyść pole po udanym zapisie
            setShowAddParticipantForm(false); // Ukryj formularz po udanym zapisie
          }
        })
        .catch(error => {
          console.error('Błąd zapisu obecności:', error);
          setAttendanceMessage({ type: 'error', text: 'Wystąpił błąd podczas zapisywania obecności. Sprawdź połączenie z internetem.' });
        });
    } catch (error) {
      console.error('Błąd zapisu obecności:', error);
      setAttendanceMessage({ type: 'error', text: 'Wystąpił błąd podczas zapisywania obecności. Sprawdź połączenie z internetem lub poprawność adresu URL.' });
    }
  };

  // NOWY HOOK: Zapisuje status obecności w localStorage przy każdej zmianie stanu
  useEffect(() => {
    try {
      localStorage.setItem('sessionAttendanceStatus', JSON.stringify(sessionAttendanceStatus));
    } catch (error) {
      console.error("Failed to save attendance status to localStorage:", error);
    }
  }, [sessionAttendanceStatus]);

  // NOWY HOOK: Resetuje status "Obecny" po 1 godzinie
  useEffect(() => {
    // Interwał sprawdzający co minutę
    const cleanupInterval = setInterval(() => {
      setSessionAttendanceStatus(prevStatus => {
        const now = new Date().getTime();
        const oneHour = 60 * 60 * 1000; // 1 godzina w milisekundach
        const newStatus = {};
        
        // Iteruj po wszystkich zapisanych statusach
        for (const key in prevStatus) {
          const entry = prevStatus[key];
          // Jeśli status jest starszy niż 1 godzina, nie dodawaj go do nowego stanu
          if (now - entry.timestamp <= oneHour) {
            newStatus[key] = entry;
          }
        }
        return newStatus;
      });
    }, 60 * 1000); // Co 1 minutę
    
    // Funkcja czyszcząca interwał po odmontowaniu komponentu
    return () => clearInterval(cleanupInterval);
  }, []); // Pusta tablica zależności sprawia, że hook uruchomi się tylko raz

  // NOWA FUNKCJA: Przekierowuje na ekran główny i ustawia filtry
  const handleSelectGroup = (day, session, group) => {
    // Zapisz znacznik czasu podświetlenia do localStorage
    const highlightKey = `${selectedUser.id}-${day}-${session}-${group}`;
    const now = new Date().getTime();
    setSessionHighlights(prev => {
      const newHighlights = { ...prev, [highlightKey]: now };
      localStorage.setItem('sessionHighlights', JSON.stringify(newHighlights));
      return newHighlights;
    });

    setSelectedDay(day);
    setSelectedColumn(session);
    setSelectedFilter(group);
    setScreen('home'); // Wróć do ekranu głównego
    setSearchQuery('');
    setAttendanceMessage(null);
  };
  
  // NOWY HOOK: Czyści przestarzałe podświetlenia co 5 minut
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      setSessionHighlights(prevHighlights => {
        const now = new Date().getTime();
        const fiveHours = 5 * 60 * 60 * 1000; // 5 godzin w milisekundach
        const newHighlights = {};

        for (const key in prevHighlights) {
          const timestamp = prevHighlights[key];
          if (now - timestamp <= fiveHours) {
            newHighlights[key] = timestamp;
          }
        }
        // Zapisz zaktualizowany stan do localStorage
        localStorage.setItem('sessionHighlights', JSON.stringify(newHighlights));
        return newHighlights;
      });
    }, 5 * 60 * 1000); // Sprawdzaj co 5 minut

    return () => clearInterval(cleanupInterval);
  }, []); // Uruchom tylko raz na początku

  const HomeScreen = () => {
    if (isLoading) {
      return (
        <div className="flex justify-center items-center h-screen">
          <p className="text-gray-600">Ładowanie danych...</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex justify-center items-center h-screen">
          <p className="text-red-500 text-center">{error}</p>
        </div>
      );
    }

    const daySpecificHeaders = getNonEmptyHeadersForSelectedDay();
    const filterOptions = getFilterOptions(selectedColumn);
    
    // ZMIENIONA LOGIKA: Pokaż listę użytkowników tylko, gdy wybrana jest grupa lub trwa wyszukiwanie
    const shouldShowUsersList = selectedFilter || debouncedSearchQuery;

    return (
      <div className="p-8 space-y-6">
        <h1 className="text-4xl font-extrabold text-center text-gray-800 mb-6">Uczestnicy zajęć</h1>
        
        {/* NOWY UKŁAD PRZYCISKÓW */}
        {/* Przycisk Dzień */}
        <div className="flex flex-col space-y-2 w-full mb-4">
          <label className="text-gray-600 font-semibold">Dzień</label>
          <select
            value={selectedDay}
            onChange={handleDayChange}
            className="p-3 border rounded-lg shadow-sm w-full focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Wybierz dzień</option>
            {Object.keys(dayRanges).map(day => (
              <option key={day} value={day}>{day}</option>
            ))}
          </select>
        </div>
        
        {/* Przyciski Zajęcia i Grupa */}
        <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4 mb-4">
          <div className="flex flex-col space-y-2 w-full md:w-1/2">
            <label className="text-gray-600 font-semibold">Zajęcia</label>
            <select
              value={selectedColumn}
              onChange={handleColumnChange}
              className="p-3 border rounded-lg shadow-sm w-full focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Wybierz zajęcia</option>
              {daySpecificHeaders.map(col => (
                <option key={col} value={col}>{col}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col space-y-2 w-full md:w-1/2">
            <label className="text-gray-600 font-semibold">Grupa</label>
            <select
              value={selectedFilter}
              onChange={handleFilterChange}
              className="p-3 border rounded-lg shadow-sm w-full focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Wybierz grupę</option>
              {filterOptions.map(option => (
                <option key={option} value={option} className={`${getBackgroundColor(option)} text-gray-800`}>
                  {option}
                </option>
              ))}
            </select>
          </div>
        </div>
        
        {/* NOWOŚĆ: Pole wyszukiwania jest teraz zawsze widoczne */}
        <div className="flex flex-col mb-4">
          <input
            type="text"
            placeholder="Wyszukaj z bazy danych"
            value={searchQuery}
            onChange={handleSearchChange}
            className="p-3 border rounded-lg shadow-sm w-full focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        
        {/* Przycisk Dodaj NOWEGO uczestnika i formularz, widoczne tylko po wybraniu zajęć i grupy */}
        {selectedDay && selectedColumn && selectedFilter && (
          <div className="w-full">
            {!showAddParticipantForm ? (
              <button
                onClick={() => setShowAddParticipantForm(true)}
                className="w-full bg-orange-500 text-white font-bold py-3 px-6 rounded-xl shadow-md hover:bg-orange-600 transition-colors duration-200"
              >
                Dodaj NOWEGO uczestnika
              </button>
            ) : (
              <div className="flex flex-col space-y-2 mt-4">
                <input
                  type="text"
                  placeholder="Wpisz nazwisko, imię i rok ur."
                  ref={newParticipantRef}
                  className="p-3 border rounded-lg shadow-sm w-full focus:ring-2 focus:ring-orange-500"
                />
                <button
                  onClick={recordNewParticipantAttendance}
                  className="w-full bg-orange-500 text-white font-bold py-3 px-6 rounded-xl shadow-md hover:bg-orange-600 transition-colors duration-200"
                >
                  Zatwierdź
                </button>
              </div>
            )}
          </div>
        )}
        
        {/* Licznik uczestników - NOWOŚĆ */}
        {shouldShowUsersList && (
          <div className="text-center p-4">
            <h2 className="text-2xl font-bold text-gray-800">Liczba uczestników: {filteredUsers.length}</h2>
          </div>
        )}

        {/* Lista uczestników w siatce - wyświetlana po wyborze filtra lub wyszukiwaniu */}
        {shouldShowUsersList && (
          filteredUsers.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
              {filteredUsers.map(user => {
                // Sprawdzenie statusu abonamentu
                const subscriptionStatus = getSubscriptionStatus(user);
                // NOWA LOGIKA: Sprawdzenie, czy podświetlenie istnieje w localStorage i czy jest starsze niż 5 godzin
                const highlightKey = `${user.id}-${selectedDay}-${selectedColumn}-${selectedFilter}`;
                const isHighlighted = sessionHighlights[highlightKey] && 
                                      new Date().getTime() - sessionHighlights[highlightKey] <= 5 * 60 * 60 * 1000;
                
                const backgroundClass = isHighlighted ? 'bg-green-300 border-2 border-green-600' : subscriptionStatus.bgColor;
                
                const isPending = pendingAttendanceTimers[user.id] !== undefined;
                const attendanceKey = `${user.id}-${selectedDay}-${selectedColumn}-${selectedFilter}`;
                const isPresent = sessionAttendanceStatus[attendanceKey]?.status;
                const buttonClass = isPresent
                  ? 'bg-green-600 hover:bg-green-700'
                  : isPending
                  ? 'bg-yellow-500 hover:bg-yellow-600'
                  : 'bg-indigo-600 hover:bg-indigo-700';

                return (
                  <div
                    key={user.id}
                    className="p-6 bg-white rounded-2xl shadow-lg flex flex-col items-start space-y-4 cursor-pointer hover:bg-gray-100 transition-colors duration-200"
                    onClick={() => {
                      setSelectedUser(user);
                      setScreen('details');
                    }}
                  >
                    {/* ZMIANA: Użycie dynamicznej klasy dla tła */}
                    <span className={`font-semibold text-xl text-gray-900 w-full px-4 py-2 rounded-xl text-center ${backgroundClass}`}>{user.name || 'Brak danych'}</span>
                    <button
                        className={`w-full text-white text-md font-bold py-3 px-6 rounded-xl shadow-md transition-colors duration-200 ${buttonClass}`}
                        onClick={(e) => {
                          e.stopPropagation(); // Zatrzymuje propagację zdarzenia do elementu <div>
                          recordAttendance(user);
                        }}
                    >
                        {isPending ? 'Obecny (Anuluj)' : (isPresent ? 'Obecny' : 'Zapisz obecność')}
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center p-8 text-gray-500 text-xl font-medium">Brak uczestników w wybranej grupie lub wyszukiwaniu.</div>
          )
        )}
      </div>
    );
  };
  
  const DetailsScreen = () => {
    if (!selectedUser || !rawSheetData.length) return null;

    // Funkcja do zbierania wszystkich oznaczeń dla wybranego użytkownika
    const getAllMarkings = (user) => {
      // Znajdź wiersz w surowych danych po jego id
      const userRow = rawSheetData[user.id + 1];
      if (!userRow) return [];

      const allMarkings = [];
      const days = Object.keys(dayRanges);

      days.forEach(day => {
        const { nameIndex, dataRange } = dayRanges[day];
        const headers = rawSheetData[0].slice(dataRange[0], dataRange[1] + 1);
        
        headers.forEach((header, colIndex) => {
          const marking = userRow[dataRange[0] + colIndex];
          if (marking && marking.trim() !== '') {
            marking.split(',').forEach(symbol => {
              allMarkings.push({
                day: day,
                session: header,
                status: symbol.trim()
              });
            });
          }
        });
      });
      
      return allMarkings;
    };
    
    // Pobierz wszystkie oznaczenia dla wybranego użytkownika
    const userMarkings = getAllMarkings(selectedUser);

    // Sprawdzanie statusu abonamentu
    const getSubscriptionStatus = (user) => {
      const userRow = rawSheetData[user.id + 1];
      const headerRow = rawSheetData[0];
      
      // Znajdź indeks kolumny na podstawie nazwy miesiąca
      const columnIndex = headerRow.indexOf(selectedMonth);

      if (columnIndex === -1 || !userRow || !userRow[columnIndex] || userRow[columnIndex].trim() === '') {
        return { status: 'Brak abonamentu', color: 'text-red-500' };
      }

      // Jeśli kolumna ma jakąkolwiek wartość, uznajemy abonament za aktywny
      const subscriptionValue = userRow[columnIndex].trim();
      if (subscriptionValue !== '') {
        return { status: 'Aktywny', color: 'text-green-600' };
      }

      return { status: 'Brak abonamentu', color: 'text-red-500' };
    };

    const subscriptionStatus = getSubscriptionStatus(selectedUser);
    const isPending = pendingAttendanceTimers[selectedUser.id] !== undefined;
    // ZMIANA: Sprawdzenie obecności na podstawie kombinacji ID, dnia, zajęć i grupy
    const attendanceKey = `${selectedUser.id}-${selectedDay}-${selectedColumn}-${selectedFilter}`;
    const isPresent = sessionAttendanceStatus[attendanceKey]?.status;
    
    const buttonClass = isPresent
      ? 'bg-green-600 hover:bg-green-700'
      : isPending
      ? 'bg-yellow-500 hover:bg-yellow-600'
      : 'bg-indigo-600 hover:bg-indigo-700';

    return (
      <div className="p-8 space-y-6 max-w-4xl mx-auto">
        <div className="flex items-center justify-start mb-6">
          <button
            className="text-indigo-600 hover:text-indigo-800 transition-colors duration-200"
            onClick={() => {
              setScreen('home');
              setAttendanceMessage(null);
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-4xl font-extrabold ml-6 text-gray-800">{selectedUser.name}</h1>
        </div>
        <div className="bg-white p-8 rounded-2xl shadow-lg">
          <h2 className="text-2xl font-semibold mb-4 text-gray-800">Plan zajęć:</h2>
          {userMarkings.length > 0 ? (
            <ul className="list-none list-inside space-y-3">
              {userMarkings.map((marking, index) => (
                <li key={index} className="text-gray-700 text-lg font-medium">
                  <span className="font-bold">{marking.day}, {marking.session}:</span> 
                  {/* ZMIANA: Dodanie onClick do symbolu grupy, aby ustawiał filtry i wracał na ekran główny */}
                  <span
                    className={`inline-block ml-3 px-3 py-1 text-md rounded-lg shadow-sm ${getBackgroundColor(marking.status)} text-gray-800 cursor-pointer hover:shadow-md transition-shadow duration-200`}
                    onClick={() => handleSelectGroup(marking.day, marking.session, marking.status)}
                  >
                    {marking.status}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            // ZMIANA: Zaktualizowany tekst komunikatu
            <p className="text-gray-500 text-lg">Nie wybrano żadnej grupy.</p>
          )}
        </div>
        
        {/* NOWA SEKCJA: Wybór miesiąca i wyświetlanie statusu abonamentu */}
        <div className="bg-white p-8 rounded-2xl shadow-lg mt-6">
          <h2 className="text-2xl font-semibold mb-4 text-gray-800">Status abonamentu:</h2>
          <div className="flex flex-col space-y-2">
            <label className="text-gray-600 font-semibold">Wybierz miesiąc</label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="p-3 border rounded-lg shadow-sm w-full focus:ring-2 focus:ring-indigo-500"
            >
              {orderedMonths.map(month => (
                <option key={month} value={month}>{month}</option>
              ))}
            </select>
          </div>
          <p className="text-gray-700 text-lg font-medium mt-4">
            {selectedMonth}: <span className={`font-bold ${subscriptionStatus.color}`}>{subscriptionStatus.status}</span>
          </p>
        </div>
        
        <button
          className={`w-full text-white font-bold py-4 px-8 rounded-xl shadow-lg transition-colors duration-200 text-xl ${buttonClass}`}
          onClick={() => recordAttendance(selectedUser)}
        >
          {isPending ? 'Obecny (Anuluj)' : 'Zapisz obecność'}
        </button>
        {attendanceMessage && (
          <div className={`p-4 rounded-lg text-center font-semibold text-lg ${attendanceMessage.type === 'success' ? 'bg-green-100 text-green-700' : attendanceMessage.type === 'error' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
            {attendanceMessage.text}
          </div>
        )}
      </div>
    );
  };
  
  return (
    <div className="bg-gray-100 min-h-screen font-sans">
      {screen === 'home' && <HomeScreen />}
      {screen === 'details' && <DetailsScreen handleSelectGroup={handleSelectGroup} />}
    </div>
  );
};

export default App;
