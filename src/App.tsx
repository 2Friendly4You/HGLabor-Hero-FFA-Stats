import { Leaderboard } from './components/Leaderboard';
import './styles/main.css';

function App() {
    return (
        <div className="App">
            <div className="container">
                <main className="main-content">
                    <Leaderboard />
                </main>
                <footer className="footer">
                    <div className="footer-content">
                        <div className="footer-buttons">
                            <a href="https://github.com/2Friendly4You/HGLabor-Hero-FFA-Stats/issues/new?template=bug_report.yml"
                                className="footer-button" target="_blank" rel="noopener">
                                <span className="material-symbols-outlined">bug_report</span>
                                Report Bug
                            </a>
                            <a href="https://github.com/2Friendly4You/HGLabor-Hero-FFA-Stats/issues/new?template=feature_request.yml"
                                className="footer-button" target="_blank" rel="noopener">
                                <span className="material-symbols-outlined">lightbulb</span>
                                Feature Request
                            </a>
                        </div>
                        <div className="footer-divider">|</div>
                        <a href="https://github.com/2Friendly4You/HGLabor-Hero-FFA-Stats" className="footer-link" target="_blank"
                            rel="noopener">
                            <span className="material-symbols-outlined">code</span>
                            View on GitHub
                        </a>
                        <div className="footer-divider">|</div>
                        <span className="footer-credit">Created with ❤️ by <a href="https://github.com/2Friendly4You"
                                className="footer-link" target="_blank" rel="noopener">2Friendly4You</a></span>
                    </div>
                </footer>
            </div>
        </div>
    );
}

export default App;
