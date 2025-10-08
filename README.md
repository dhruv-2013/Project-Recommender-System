# Project Recommender System (WIP)

An AI-powered platform designed to **intelligently match students with academic or industry projects** based on their skills, interests, and background.  
The goal is to streamline the project allocation process, enhance fairness, and promote meaningful collaborations through data-driven insights.

**Live Preview:** [project-recommender-system.vercel.app](https://canvas-flex-creator-2wc3svubw-dhruv-2013s-projects.vercel.app)

---

## Project Status

> ⚙️ **Work in Progress**  
> The system is actively being developed as part of a research initiative at UNSW under the EF Grant.  
> Core modules — such as NLP-based skill extraction, vectorized search, and project recommendation logic — are currently in progress.

---

## Objective

To develop a scalable and AI-assisted platform that can:
- Automatically extract and interpret student skillsets from resumes or manual inputs  
- Recommend the most suitable projects using hybrid recommendation algorithms  
- Assist administrators in project approvals, supervision assignments, and performance tracking  
- Support fair and data-informed team formation based on complementary skills and project demands  

---

## System Overview


The architecture combines **LLM-based text embeddings** with **vector similarity search** to align student competencies and project requirements.

---

## Tech Stack

| Layer | Technologies |
|-------|---------------|
| **Frontend** | React, Vite, TypeScript, Tailwind CSS, shadcn/ui |
| **Backend** | Supabase (PostgreSQL, Auth, Storage, Edge Functions) |
| **Database** | PostgreSQL with pgvector for embeddings |
| **AI/NLP** | OpenAI / Google embeddings for skill extraction |
| **Deployment** | Vercel |

---

## Key Features (Planned)

- 🔍 **AI Skill Extraction:** Automatically parse and vectorize student skills  
- 🎓 **Smart Project Matching:** Rank projects by relevance using similarity metrics  
- 🧑‍🏫 **Admin Dashboard:** Manage projects, teams, and approvals  
- 🤝 **Team Formation:** Suggest ideal combinations of students based on skill complementarity  
- 📊 **Analytics Dashboard:** Visualize skill distributions, project coverage, and matching accuracy  

---

## Research Context

This project is part of the **UNSW EF Grant Research Initiative**, supervised by **Dr. Basem Suleiman** and **Mr. Sonit Singh**, focusing on developing scalable, fair, and AI-driven academic allocation systems.  
The system will be evaluated on parameters such as **matching accuracy**, **diversity of skill utilization**, and **user satisfaction**.

---

## Design Preview

> *(UI components and dashboard prototypes are under active development — screenshots will be added soon.)*

---

## Future Enhancements

- Integration with UNSW course/project databases  
- Multi-factor ranking using experience, grades, and interests  
- Feedback-driven model improvement  
- Exportable reports for supervisors and coordinators  
- Support for cross-faculty collaborations and industry projects  

---

## License

This project will be released under the **MIT License** once the first public version is deployed.

---

## Author

**Dhruv Gulwani**  
UNSW Computer Engineering Graduate | Research Assistant | AI & Frontend Developer  
[LinkedIn](https://www.linkedin.com/in/dhruv-gulwani-b12109238/)

---

## Acknowledgements

- **Supervisors:** Dr. Basem Suleiman, Mr. Sonit Singh  
- **Institution:** School of Computer Science and Engineering, UNSW Sydney  
- **Funding:** UNSW EF Grant — Project Recommendation System Initiative

---
