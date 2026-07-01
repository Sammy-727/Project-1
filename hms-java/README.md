# GrandStay HMS — Java Spring Boot Edition

Full Hotel Management System built with **Java 17**, **Spring Boot 3**, **Spring Security**, **Spring Data JPA**, **H2 Database**, and **Thymeleaf**.

## Requirements

- **JDK 17+** (download from https://adoptium.net/)
- **Maven 3.8+** (https://maven.apache.org/) OR use `mvnw.cmd` wrapper

## Windows Quick Start

1. Install **JDK 17+** (check "Add to PATH")
2. Install **Maven** (or use included wrapper)
3. Open folder `hms-java`
4. Double-click **`START.bat`**
5. Open **http://localhost:8080**
6. Login: `admin` / `admin123`

## Mac / Linux

```bash
cd hms-java
mvn spring-boot:run
```

Open: http://localhost:8080

## Login Accounts

| Username | Password | Role |
|----------|----------|------|
| admin | admin123 | Admin |
| manager | manager123 | Manager |
| reception | rec123 | Receptionist |
| superadmin | admin123 | Super Admin |

## Build JAR

```bash
mvn clean package -DskipTests
java -jar target/hms-1.0.0.jar
```

## Modules

- Dashboard (live stats, recent bookings/payments)
- Rooms (CRUD, search, filter)
- Customers (CRUD, guests)
- Bookings (create, cancel, overlap prevention)
- Check In / Out (arrivals, checkout, billing)
- Payments (record, revenue tracking)
- Employees, Housekeeping, Room Service, Inventory
- User management (Admin)
- Global search

## Database

- Embedded **H2** database stored in `./data/hoteldb.mv.db`
- Auto-seeded on first run with demo data
- Reset: delete `data/` folder and restart

## H2 Console (dev)

http://localhost:8080/h2-console  
JDBC URL: `jdbc:h2:file:./data/hoteldb`  
User: `sa` / Password: (empty)

## Project Structure

```
hms-java/
├── pom.xml
├── START.bat
├── src/main/java/com/grandstay/hms/
│   ├── HmsApplication.java
│   ├── config/          # Security, global models
│   ├── controller/      # Web controllers
│   ├── model/           # JPA entities
│   ├── repository/      # Spring Data repos
│   └── service/         # Business logic + seeder
└── src/main/resources/
    ├── application.properties
    ├── static/css/      # Premium UI styles
    └── templates/       # Thymeleaf pages
```
