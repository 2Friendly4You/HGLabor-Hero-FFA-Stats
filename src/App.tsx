import { Leaderboard } from './components/Leaderboard';
import { Footer } from './components/Footer';
import './App.css';
import './styles/main.css';

function App() {
    return (
        <div className="App">
            <div className="container">
                <Leaderboard />
            </div>
            <Footer />
        </div>
    );
}

export default App;
