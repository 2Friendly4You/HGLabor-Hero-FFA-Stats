import React from 'react';
import { FaGithub, FaBug, FaLightbulb } from 'react-icons/fa';

export const Footer: React.FC = () => {
    return (
        <footer className="footer">
            <div className="footer-content">
                <div className="footer-buttons">
                    <a 
                        href="https://github.com/2Friendly4You/HGLabor-Hero-FFA-Stats/issues/new?template=bug_report.yml"
                        className="footer-button" 
                        target="_blank" 
                        rel="noopener noreferrer"
                    >
                        <FaBug />
                        Report Bug
                    </a>
                    <a 
                        href="https://github.com/2Friendly4You/HGLabor-Hero-FFA-Stats/issues/new?template=feature_request.yml"
                        className="footer-button" 
                        target="_blank" 
                        rel="noopener noreferrer"
                    >
                        <FaLightbulb />
                        Feature Request
                    </a>
                </div>
                <div className="footer-divider">|</div>
                <a 
                    href="https://github.com/2Friendly4You/HGLabor-Hero-FFA-Stats" 
                    className="footer-link" 
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    <FaGithub />
                    View on GitHub
                </a>
                <div className="footer-divider">|</div>
                <span className="footer-credit">
                    Created with ❤️ by {' '}
                    <a 
                        href="https://github.com/2Friendly4You"
                        className="footer-link" 
                        target="_blank" 
                        rel="noopener noreferrer"
                    >
                        2Friendly4You
                    </a>
                </span>
            </div>
        </footer>
    );
};