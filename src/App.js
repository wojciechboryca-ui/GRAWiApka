import { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// IMPORTANT: Replace the placeholder values below with your actual Firebase config
// WAŻNE: Zastąp poniższe wartości rzeczywistą konfiguracją Firebase
const firebaseConfig = {
    apiKey: "AIzaSyDmXVesIeeVgQcdUnucdzCDQYz2QQDXico",
    authDomain: "grawiapka.firebaseapp.com",
    projectId: "grawiapka",
    storageBucket: "grawiapka.firebasestorage.app",
    messagingSenderId: "630484244372",
    appId: "1:630484244372:web:745385625f35b9de056181",
    measurementId: "G-GPP6NNHKDY"
};

// Initialize Firebase and get service references
// Inicjalizacja Firebase i pobranie referencji do usług
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// App Component
const App = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        // Set up an authentication state observer
        // Ustawienie obserwatora stanu uwierzytelnienia
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            setLoading(false);
        });

        // Clean up the observer on component unmount
        // Usunięcie obserwatora po odmontowaniu komponentu
        return () => unsubscribe();
    }, []);

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        try {
            await signInWithEmailAndPassword(auth, email, password);
        } catch (err) {
            console.error(err);
            setError('Błąd logowania. Sprawdź e-mail i hasło.');
        }
    };

    const handleLogout = async () => {
        try {
            await signOut(auth);
        } catch (err) {
            console.error(err);
            setError('Błąd wylogowania.');
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-100">
                <p className="text-xl text-gray-700">Ładowanie...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
            {user ? (
                // Logged-in view
                // Widok po zalogowaniu
                <div className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-md text-center">
                    <h1 className="text-3xl font-bold text-gray-800 mb-4">Witaj!</h1>
                    <p className="text-gray-600 mb-6">Jesteś zalogowany jako {user.email}.</p>
                    <button
                        onClick={handleLogout}
                        className="w-full bg-red-500 text-white p-3 rounded-lg font-semibold hover:bg-red-600 transition-colors duration-200"
                    >
                        Wyloguj się
                    </button>
                </div>
            ) : (
                // Login form
                // Formularz logowania
                <div className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-md">
                    <h1 className="text-3xl font-bold text-center text-gray-800 mb-6">Logowanie do GRAWiApka</h1>
                    {error && <p className="text-red-500 text-center mb-4">{error}</p>}
                    <form onSubmit={handleLogin} className="space-y-4">
                        <input
                            type="email"
                            placeholder="E-mail"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                        />
                        <input
                            type="password"
                            placeholder="Hasło"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                        />
                        <button
                            type="submit"
                            className="w-full bg-blue-600 text-white p-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors duration-200"
                        >
                            Zaloguj się
                        </button>
                    </form>
                </div>
            )}
        </div>
    );
};

export default App;
