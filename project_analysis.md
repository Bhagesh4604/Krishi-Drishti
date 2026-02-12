The `Krishi-Drishti` project is a comprehensive full-stack agricultural platform with a Python/FastAPI backend and a React/TypeScript frontend.

**Key Features:**

*   **GIS/Mapping:** Users can manage and visualize farm plots (e.g., in `screens/FarmMapScreen.tsx`) using Leaflet for 2D maps and `react-globe.gl` for 3D visualization. Plot data (coordinates, health score, moisture) is stored in the `plots` table (`backend/models.py`).
*   **Carbon Credits:** A sophisticated system for enrolling farm plots in carbon projects, tracking projected and verified carbon sequestration, and managing evidence submission (handled by `backend/routers/carbon.py`).
*   **AI Chatbot:** An AI-powered chat interface (`screens/ChatScreen.tsx`) for providing farming advice, utilizing the `@google/genai` library on the frontend and integrated with backend AI services (`backend/routers/ai.py`).
*   **Marketplace:** A platform (`screens/MarketScreen.tsx`, `screens/MarketDetailScreen.tsx`) for farmers to list and sell their produce (`backend/routers/market.py`, `backend/models.py`).
*   **Crop Stress Detection:** Uses AI to analyze crop images and satellite data for stress detection and recommendations (`screens/CropStressScreen.tsx`, `backend/routers/ai.py`).
*   **Government Schemes:** Provides information and a mechanism to apply for government agricultural schemes (`screens/SchemeSetuScreen.tsx`, `backend/routers/schemes.py`).
*   **Weather Forecasting:** Integrates with Open-Meteo for real-time weather data and reverse geocoding to provide location-specific forecasts (`components/WeatherModal.tsx`, `backend/routers/weather.py`).
*   **Insurance:** Offers a search and enrollment system for various agricultural insurance schemes (`screens/InsuranceScreen.tsx`, `backend/routers/insurance.py`).
*   **Smart Contracts:** Enables the creation and signing of digital contracts for produce sales (`screens/ContractsScreen.tsx`, `backend/routers/contracts.py`).
*   **User Profiles:** Manages user authentication (OTP-based) and profile details (`screens/AuthScreen.tsx`, `screens/ProfileScreen.tsx`, `backend/routers/auth.py`, `backend/routers/users.py`).

**Technologies:**

*   **Frontend:**
    *   **Framework:** React
    *   **Language:** TypeScript
    *   **Build Tool:** Vite
    *   **Styling:** Tailwind CSS
    *   **API Client:** Axios
    *   **Mapping:** Leaflet, `react-leaflet`, `react-globe.gl`, `three`
    *   **Icons:** `lucide-react`
    *   **AI Integration:** `@google/genai`
*   **Backend:**
    *   **Framework:** FastAPI
    *   **Language:** Python
    *   **Database:** SQLite (SQLAlchemy ORM)
    *   **AI/ML:** `google-generativeai`, PIL (Pillow) for image processing, `scikit-learn` (implied for some AI tasks)
    *   **Authentication:** `python-jose`, `passlib`
    *   **Environment Management:** `python-dotenv`
    *   **HTTP Client:** `httpx` (for external API calls)
    *   **Geospatial:** Google Earth Engine (`ee`), `requests` (for external satellite services like AgroMonitoring)

**Architecture Overview:**

*   **Frontend (React/Vite/TypeScript):** The application uses a single `App.tsx` component to manage screen navigation based on a `currentScreen` state. It includes various screen components for each feature (e.g., `DashboardScreen`, `MarketScreen`, `ChatScreen`). Communication with the backend is handled through a centralized API service layer (`src/services/api.ts`) using `axios`.
*   **Backend (FastAPI/Python):** The backend is structured with `routers` for each functional area (e.g., `auth`, `users`, `market`, `ai`, `plots`, `carbon`). It uses SQLAlchemy for object-relational mapping to interact with the SQLite database (`krishi_drishti.db`). Authentication is handled via JWT tokens. AI features leverage the Google Generative AI API and Google Earth Engine for advanced analysis.

The project is well-organized with a clear separation of concerns, making it modular and scalable. The integration of various AI and geospatial services demonstrates a robust approach to modern agricultural challenges.