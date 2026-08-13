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

================================================================================
                    SECURE ANALYTICS & VAULT PLATFORM
                     ARCHITECTURE & TECHNICAL MANUAL
================================================================================

--------------------------------------------------------------------------------
1. WHY THIS ARCHITECTURE IS UNIQUE
--------------------------------------------------------------------------------

[A] ZERO-KNOWLEDGE "VAULT" ARCHITECTURE
    Traditional platforms save generated PDF/HTML reports directly in plain database
    rows or public/private cloud buckets. System administrators, database leaks, or
    compromised backend processes can easily expose user data.
    
    * Our Approach: Reports are encrypted client-side using user-managed keys
      (AES-256-GCM + Argon2id derivation) BEFORE reaching persistent storage.
    * Centralized Risk Elimination: The server NEVER stores the user's Vault key. 
      Even in the event of a full database and S3 bucket leak, an attacker sees
      only mathematically uncrackable ciphertext.

[B] AUTOMATIC EPHEMERAL STAGING & IMMEDIATE CLEANUP
    Web analytics applications frequently leave temporary user files lying in /tmp
    directories or staging databases long after analysis completes.

    * Our Approach: Ephemeral storage lifecycle. Raw datasets live in temporary S3
      buckets ONLY during worker execution. Once the Celery task generates the report,
      an explicit memory flush and object deletion run immediately.

[C] DECOUPLED COMPUTE & ASYNCHRONOUS ENGINE
    Executing heavy analytical scripts (Polars, pandas, scikit-learn) inside HTTP
    request handlers freezes API endpoints and crashes web servers.

    * Our Approach: Strict separation of HTTP request/response logic from compute tasks.
      FastAPI hands off heavy execution contracts to an asynchronous Celery + Redis queue.
      API response latencies remain under 50ms regardless of dataset size.


--------------------------------------------------------------------------------
2. SYSTEM ARCHITECTURE & DATA FLOW
--------------------------------------------------------------------------------

[ Client Browser: React + Vite ]
         |
         |  1. Upload Dataset (Presigned S3 URL)
         v
[ Temp S3 Staging Bucket ]
         |
         |  2. Trigger Job Request (POST /api/v1/analyze)
         v
[ FastAPI Backend ] ───────► Stores Job State / Metadata ───────► [ PostgreSQL DB ]
         |
         |  3. Enqueue Async Task
         v
[ Redis Message Broker ]
         |
         |  4. Pull Task Execution
         v
[ Celery Analytics Workers ] (Polars, DuckDB, PyArrow, SciPy, scikit-learn)
         |
         |-- 5a. Read File & Generate Insights
         |-- 5b. Build PDF Report (WeasyPrint / ReportLab)
         |-- 5c. Encrypt Payload with User's Vault Key
         |-- 5d. Flush Raw Staging File & Worker RAM
         v
[ Encrypted Vault S3 Bucket ] (Private Ciphertext Storage)


--------------------------------------------------------------------------------
3. TECH STACK LAYER-BY-LAYER BREAKDOWN
--------------------------------------------------------------------------------

+------------------------------------------------------------------------------+
| LAYER 1: FRONTEND                                                            |
+------------------------------------------------------------------------------+
* React + TypeScript + Vite:
  - Strongly-typed SPA framework providing instant compile times and zero-overhead
    bundle sizes.
  - Handles client-side encryption/decryption routines directly in browser memory.

* Tailwind CSS:
  - Low-overhead utility CSS driving flexible grid systems, controls, and dark-mode
    dashboards.

* Apache ECharts & Plotly.js:
  - Renders high-performance interactive data graphics directly onto HTML Canvas/SVG.
  - Enables client-side zooming, dynamic filter shifts, and real-time dimension 
    slicing without re-querying the backend.

+------------------------------------------------------------------------------+
| LAYER 2: API BACKEND & STATE STORAGE                                         |
+------------------------------------------------------------------------------+
* Python + FastAPI:
  - High-throughput asynchronous web framework utilizing Pydantic for rigid runtime 
    type validation.
  - Generates OpenAPI specifications automatically while remaining decoupled from
    heavy CPU work.

* PostgreSQL:
  - Operates purely as an operational index engine.
  - Stores: User profiles, hashed authentication keys, active session IDs, job state 
    enums (PENDING/RUNNING/SUCCESS), and encrypted report index references.
  - STORES NO RAW DATASETS OR UNENCRYPTED REPORT CONTENTS.

+------------------------------------------------------------------------------+
| LAYER 3: ASYNCHRONOUS TASK QUEUE                                             |
+------------------------------------------------------------------------------+
* Redis:
  - Low-latency in-memory data store acting as the Celery task broker and state backend.

* Celery Workers:
  - Distributed worker processes isolated from API handlers.
  - Listens for analytical job signatures, scales across CPU cores independently, 
    and manages execution lifecycles.

+------------------------------------------------------------------------------+
| LAYER 4: ANALYTICS & DATA PROCESSING ENGINE                                  |
+------------------------------------------------------------------------------+
* Polars & DuckDB:
  - Multi-threaded columnar query engines optimized for large tabular datasets.
  - Significantly faster and more memory-efficient than single-threaded legacy 
    pandas solutions.

* PyArrow:
  - Zero-copy columnar memory structure enabling ultra-fast interchange between 
    Parquet, Feather, CSV, and internal memory arrays.

* SciPy / statsmodels / scikit-learn:
  - Runs statistical profiling, hypothesis testing, predictive regression modeling,
    and clustering pipelines.

* Excel Ingestion Engine (Polars + openpyxl / calamine):
  - Ingests structured `.xlsx`/`.xls` workbooks with fallback support for complex 
    multi-sheet features.

+------------------------------------------------------------------------------+
| LAYER 5: REPORT GENERATION & STORAGE                                         |
+------------------------------------------------------------------------------+
* WeasyPrint / ReportLab:
  - Converts HTML/Jinja2 templates into crisp, standardized publication-grade PDFs.

* Matplotlib / Plotly:
  - Renders static high-resolution vector diagrams (.svg/.png) embedded directly into
    generated PDF reports.

* S3-Compatible Temporary Bucket:
  - Receives uploaded datasets directly from client browsers via presigned URLs.
  - Features immediate application-driven deletion paired with aggressive S3 lifecycle 
    expiration rules.

* S3-Compatible Vault Bucket:
  - Stores only AES-GCM encrypted report payload ciphertext and non-sensitive hashes.

+------------------------------------------------------------------------------+
| LAYER 6: DEPLOYMENT & CONTAINERIZATION                                       |
+------------------------------------------------------------------------------+
* Docker Containers & Reverse Proxy (Nginx / Traefik):
  - Fully containerized topology separating Web, API, Worker, DB, and Queue processes.
  - Restricts resource allocations (RAM/CPU limits) per container to protect host systems.


--------------------------------------------------------------------------------
4. CRYPTOGRAPHIC VAULT FLOW SCHEMATIC
--------------------------------------------------------------------------------

[ USER SETUP ]
  User Vault Password ──► [ Argon2id KDF ] ──► 256-bit Symmetric Key

[ ENCRYPTION (Post-Analysis) ]
  Raw Analysis PDF Payload
           │
           v
  [ AES-256-GCM Encryption Engine ] ◄── (256-bit Symmetric Key)
           │
           v
  Encrypted Ciphertext Block ──► Uploaded to Private Vault S3 Bucket

[ SESSION TERMINATION ]
  Logout Event Triggered
           │
           v
  1. Wipe Client-Side Session Tokens & In-Memory Vault Key
  2. Terminate Database Connections & Active Staging Buffers
  3. Purge Temporary Dataset Files from S3

[ RECOVERY / DECRYPTION ]
  User enters Vault Password ──► Key Derived ──► Decrypts Ciphertext in Browser RAM
 request timeouts for other users.Your Platform: Unlinks heavy computation from HTTP handling using an asynchronous Celery + Redis task-distribution queue. The API remains lighting-fast while compute-heavy worker nodes scale independently across CPU/GPU instances.
