# Secure Data Vault

build a website using this | Layer                   | Recommended technology                                                                                     | Reason                                                                                                                                                                                                          |

| ----------------------- | ---------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |

| Frontend                | **React + TypeScript + Vite**                                                                              | A clean independent frontend that can connect to any documented backend API.                                                                                                                                    |

| UI and charts           | Tailwind CSS plus Apache ECharts or Plotly.js                                                              | Suitable for interactive dashboards, tables, filters, and automatically selected visualizations.                                                                                                                |

| API backend             | **Python + FastAPI**                                                                                       | Strong fit for file APIs, authentication, typed request/response schemas, and Python analytics integration.                                                                                                     |

| Job queue               | **Celery + Redis initially**                                                                               | Long-running analytics should not run inside API request processes. FastAPI itself recommends larger task-queue tools for heavy work, while Celery distributes tasks to worker processes or machines \[1] \[2]. |

| Analytics workers       | **Python, Polars, DuckDB, PyArrow, pandas, SciPy, statsmodels, and scikit-learn**                          | Supports large tabular files, data profiling, statistical analysis, forecasting, and machine learning.                                                                                                          |

| Excel ingestion         | Polars with appropriate Excel engines, supplemented by openpyxl when workbook-specific features require it | Polars documents Excel ingestion through external engines rather than a single native reader \[3].                                                                                                              |

| Database                | **PostgreSQL**                                                                                             | Stores accounts, sessions, job state, report metadata, salts, non-sensitive settings, and audit events—not dataset contents.                                                                                    |

| Temporary file storage  | S3-compatible object storage with a dedicated temporary bucket                                             | Handles large uploads without routing every byte through the API server. Application cleanup should run immediately, with lifecycle expiration as a secondary safety net \[4].                                  |

| Encrypted vault storage | Separate private object-storage bucket                                                                     | Stores only encrypted report ciphertext and non-sensitive metadata.                                                                                                                                             |

| Report generation       | WeasyPrint or ReportLab for structured PDFs; Plotly or Matplotlib for report charts                        | Produces professional, consistent PDF output.                                                                                                                                                                   |

| Deployment              | Docker containers behind a reverse proxy, with separate API and worker services                            | Allows resource limits, isolated workers, independent scaling, and safer cleanup.                                                                                                                               and add a feature called vault in which when user loggins his database must close after termination of session and a copy of the report of the analysis must be safed which must be accesssible only by the user by enterring the correct password on vault user must be able to set his own password

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/f3e8c872-c31c-4c89-b811-3b0f0502ffeb).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
