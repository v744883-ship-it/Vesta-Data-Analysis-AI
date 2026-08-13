# Vesta-Data-Analysis-AI

# Secure Analytics & Vault Platform

A high-performance, privacy-focused data profiling, statistical analysis, and report generation platform. Built with a decoupled **React + FastAPI** architecture, asynchronous **Celery/Redis** task queues, and zero-knowledge ciphertext storage via a dedicated **Encrypted Vault**.

---

## 📸 Key Features

* **Advanced Analytics Engine**: High-speed dataset profiling, statistical testing, forecasting, and machine learning powered by Polars, DuckDB, and scikit-learn.
* **Interactive Dashboards**: Dynamic charts, data tables, and filtering powered by Tailwind CSS, Apache ECharts, and Plotly.js.
* **Async Job Processing**: Offloaded long-running analysis tasks using Celery workers to prevent API blocking.
* **🔒 Secure Vault**: Zero-exposure user-managed encrypted vault for report retention.
  * **Session Auto-Termination**: Database session contexts and temporary processing buffers are immediately wiped upon session logout or termination.
  * **Zero-Knowledge Ciphertext**: Analysis reports are encrypted prior to private storage.
  * **User-Managed Encryption Passwords**: Vault reports can only be unlocked by supplying the user's custom vault password.

---

## 🛠️ Technology Stack Architecture

| Layer | Recommended Technology | Purpose & Architectural Justification |
| :--- | :--- | :--- |
| **Frontend** | React + TypeScript + Vite | Clean, fast, component-driven UI connecting to stateless REST APIs. |
| **UI & Visualizations** | Tailwind CSS + Apache ECharts / Plotly.js | Interactive dashboards, filtering, responsive tables, and automatic chart generation. |
| **API Backend** | Python + FastAPI | Typed request/response schemas, high-concurrency file handling, and native Python analytics integration. |
| **Job Queue** | Celery + Redis | Asynchronous background worker orchestration to keep API request handling lightweight. |
| **Analytics Workers** | Polars, DuckDB, PyArrow, pandas, SciPy, statsmodels, scikit-learn | Scalable tabular ingestion, fast query execution, data profiling, statistical analysis, and ML modeling. |
| **Excel Ingestion** | Polars + openpyxl engine | High-throughput Excel spreadsheet ingestion using external parsing engines. |
| **Database** | PostgreSQL | Manages user accounts, active sessions, job states, metadata, salts, and audit trails *(never stores raw datasets)*. |
| **Temporary File Storage** | S3-compatible Object Storage (Temp Bucket) | Handles large dataset uploads; cleared immediately post-analysis with S3 lifecycle expiration backup. |
| **Encrypted Vault Storage** | Private S3 Bucket (Vault) | Securely stores encrypted report ciphertext and non-sensitive metadata. |
| **Report Generation** | WeasyPrint / ReportLab + Plotly / Matplotlib | Produces structured, publication-ready PDF reports and charts. |
| **Deployment** | Docker + Reverse Proxy (Nginx/Traefik) | Isolated containers for API and worker services with independent scaling and resource limits. |

---

## 🔐 The "Vault" Security Architecture

The **Vault** is designed to guarantee data privacy and isolate user analytical reports even if underlying session states are compromised.

## 📁 Repository Structure

```text
.
├── apps/
│   ├── web/                  # React + TypeScript + Vite Frontend
│   │   ├── src/
│   │   │   ├── components/   # UI Components & ECharts Integration
│   │   │   ├── features/     # Vault, Analytics, & Auth Modules
│   │   │   └── pages/        # Application Routes
│   │   └── package.json
│   └── api/                  # FastAPI Backend & Celery Workers
│       ├── app/
│       │   ├── api/          # FastAPI Route Controllers
│       │   ├── core/         # Security, Vault Encryption, Configs
│       │   ├── db/           # PostgreSQL Schema & Sessions
│       │   ├── services/     # Polars/DuckDB Analytics Pipeline
│       │   └── worker/       # Celery Task Definitions
│       └── Requirements.txt
├── docker/                   # Dockerfiles & Reverse Proxy Configs
├── docker-compose.yml        # Orchestration (API, Workers, Redis, Postgres, S3 Mock)
└── README.md

What Makes This Project Unique?1. Zero-Knowledge "Vault" ArchitectureMost analytics platforms generate PDF or HTML reports and store them directly in plain database rows or cloud buckets, making them accessible to system admins, cloud operators, or potential database leaks.Your Platform: Stores report payloads inside an Encrypted Vault Bucket using zero-knowledge client-side encryption (AES-256-GCM / Argon2id).  No Centralized Decryption Key: The backend server never stores the user's Vault key. Even if your database and S3 buckets are completely leaked, the attacker sees only raw ciphertext.  2. Automatic Ephemeral Staging & Instant CleanupTraditional data analysis web apps often leave raw customer datasets hanging in /tmp folders or database staging tables long after the report is produced.Your Platform: Uses ephemeral ingestion. Dataset files are placed in a temporary S3 bucket only for the duration of the analysis task. Once the Celery worker finishes generating the report, it issues an immediate memory flush and storage purge.3. Decoupled Compute & API ExecutionRunning heavy data manipulation (Polars, pandas, scikit-learn) inside standard FastAPI request handlers will freeze the server, causing request timeouts for other users.Your Platform: Unlinks heavy computation from HTTP handling using an asynchronous Celery + Redis task-distribution queue. The API remains lighting-fast while compute-heavy worker nodes scale independently across CPU/GPU instances.
