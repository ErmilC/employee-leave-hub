# Employee Leave Hub

Aplicație web pentru administrarea concediilor angajaților.

## Rulare proiect

Pentru a rula proiectul este necesar **Docker Desktop** sau **Docker Engine cu plugin-ul Compose**.

1. Deschideți un terminal în folderul rădăcină al proiectului.
2. Rulați comanda de pornire:

```bash
docker compose up -d --build
```

Pentru a opri aplicația:

```bash
docker compose down
```

## Accesare servicii

După pornirea containerelor, serviciile sunt disponibile la:

- **Interfață Web (Frontend):** http://localhost:8081
- **API REST (Backend):** http://localhost:8080/api
- **Consolă Bază de Date (H2 Console):** http://localhost:8080/h2-console
  - JDBC URL: `jdbc:h2:file:./data/leavehubdb`
  - Utilizator: `sa`
  - Parolă: `password`

### Conturi demo

Baza de date este inițializată automat cu următoarele conturi de test:

| Nume | Email | Rol | Parolă |
| :--- | :--- | :--- | :--- |
| Ana Maria Stan | admin@test.ro | Administrator (ADMIN) | password |
| Alexandru Popescu | alex.popescu@test.ro | Manager Departament (DEPT_RESP) | password |
| Elena Ionescu | elena.ionescu@test.ro | Angajat (USER) | password |
| Mihai Radu | mihai.radu@test.ro | Angajat (USER) | password |

## Tehnologii folosite

- **Backend:** Java 17, Spring Boot 3, Spring Data JPA, Spring Security (autentificare JWT, parole criptate cu BCrypt), OpenPDF (generare automată cereri PDF)
- **Frontend:** Angular 17, TypeScript, CSS
- **Bază de date:** H2 (relațională)
- **Containerizare & Web Server:** Docker, Nginx
