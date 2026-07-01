package com.grandstay.hms.service;

import com.grandstay.hms.model.*;
import com.grandstay.hms.repository.*;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Component
public class DataSeeder implements CommandLineRunner {

    private final UserRepository userRepository;
    private final RoomRepository roomRepository;
    private final CustomerRepository customerRepository;
    private final BookingRepository bookingRepository;
    private final PaymentRepository paymentRepository;
    private final EmployeeRepository employeeRepository;
    private final InventoryRepository inventoryRepository;
    private final HousekeepingTaskRepository housekeepingTaskRepository;
    private final RoomServiceRequestRepository roomServiceRequestRepository;
    private final PasswordEncoder passwordEncoder;

    public DataSeeder(UserRepository userRepository, RoomRepository roomRepository,
                      CustomerRepository customerRepository, BookingRepository bookingRepository,
                      PaymentRepository paymentRepository, EmployeeRepository employeeRepository,
                      InventoryRepository inventoryRepository, HousekeepingTaskRepository housekeepingTaskRepository,
                      RoomServiceRequestRepository roomServiceRequestRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.roomRepository = roomRepository;
        this.customerRepository = customerRepository;
        this.bookingRepository = bookingRepository;
        this.paymentRepository = paymentRepository;
        this.employeeRepository = employeeRepository;
        this.inventoryRepository = inventoryRepository;
        this.housekeepingTaskRepository = housekeepingTaskRepository;
        this.roomServiceRequestRepository = roomServiceRequestRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) {
        if (userRepository.count() > 0) return;
        seedUsers();
        seedRooms();
        seedCustomers();
        seedEmployees();
        seedInventory();
        seedBookings();
        seedPayments();
        seedHousekeeping();
        seedRoomService();
    }

    private void seedUsers() {
        createUser("superadmin", "admin123", "Super Admin User", UserRole.SUPER_ADMIN);
        createUser("admin", "admin123", "Hotel Admin", UserRole.ADMIN);
        createUser("manager", "manager123", "Operations Manager", UserRole.MANAGER);
        createUser("reception", "rec123", "Front Desk Reception", UserRole.RECEPTIONIST);
        createUser("housekeeping", "hk123", "Housekeeping Lead", UserRole.HOUSEKEEPING);
        createUser("staff", "staff123", "General Staff", UserRole.STAFF);
    }

    private void createUser(String username, String password, String fullName, UserRole role) {
        User u = new User();
        u.setUsername(username);
        u.setPassword(passwordEncoder.encode(password));
        u.setFullName(fullName);
        u.setRole(role);
        u.setStatus("Active");
        userRepository.save(u);
    }

    private void seedRooms() {
        var amenities = Map.of(
                "Standard", "WiFi, TV, AC",
                "Deluxe", "WiFi, TV, AC, Mini Bar",
                "Super Deluxe", "WiFi, Smart TV, AC, Mini Bar, Balcony",
                "Luxury", "WiFi, Smart TV, AC, Mini Bar, Jacuzzi",
                "Presidential Suite", "WiFi, Smart TV, AC, Mini Bar, Jacuzzi, Butler"
        );
        var prices = Map.of("Standard", 1500.0, "Deluxe", 3000.0, "Super Deluxe", 5000.0, "Luxury", 8000.0, "Presidential Suite", 15000.0);
        var caps = Map.of("Standard", 2, "Deluxe", 2, "Super Deluxe", 3, "Luxury", 4, "Presidential Suite", 6);

        for (int i = 101; i <= 110; i++) addRoom(String.valueOf(i), "Standard", 1, prices, caps, amenities);
        for (int i = 201; i <= 210; i++) addRoom(String.valueOf(i), "Deluxe", 2, prices, caps, amenities);
        for (int i = 301; i <= 308; i++) addRoom(String.valueOf(i), "Super Deluxe", 3, prices, caps, amenities);
        for (int i = 401; i <= 406; i++) addRoom(String.valueOf(i), "Luxury", 4, prices, caps, amenities);
        for (int i = 501; i <= 503; i++) addRoom(String.valueOf(i), "Presidential Suite", 5, prices, caps, amenities);
    }

    private void addRoom(String no, String type, int floor, java.util.Map<String, Double> prices,
                         java.util.Map<String, Integer> caps, java.util.Map<String, String> amenities) {
        Room r = new Room();
        r.setRoomNo(no);
        r.setRoomType(type);
        r.setFloor(floor);
        r.setPrice(prices.get(type));
        r.setCapacity(caps.get(type));
        r.setStatus(RoomStatus.AVAILABLE);
        r.setAmenities(amenities.get(type));
        roomRepository.save(r);
    }

    private void seedCustomers() {
        String[][] data = {
                {"Ayush Sharma", "9876543210", "ayush@example.com", "Dehradun", "Aadhar", "AADHAR-1001", "Male", "28"},
                {"Priya Mehta", "9876543211", "priya@example.com", "Delhi", "Passport", "PASS-1002", "Female", "32"},
                {"Rohan Verma", "9876543212", "rohan@example.com", "Jaipur", "Aadhar", "AADHAR-1003", "Male", "35"},
                {"Sneha Kapoor", "9876543213", "sneha@example.com", "Mumbai", "PAN Card", "PAN-1004", "Female", "29"},
                {"Karan Singh", "9876543214", "karan@example.com", "Lucknow", "Aadhar", "AADHAR-1005", "Male", "41"},
                {"Neha Joshi", "9876543215", "neha@example.com", "Pune", "Driving License", "DL-1006", "Female", "27"},
                {"Rahul Gupta", "9876543216", "rahul@example.com", "Noida", "Aadhar", "AADHAR-1007", "Male", "33"},
                {"Aditi Sharma", "9876543217", "aditi@example.com", "Chandigarh", "Voter ID", "VID-1008", "Female", "30"},
                {"Vivek Kumar", "9876543218", "vivek@example.com", "Patna", "Aadhar", "AADHAR-1009", "Male", "38"},
                {"Anjali Jain", "9876543219", "anjali@example.com", "Indore", "Passport", "PASS-1010", "Female", "26"},
                {"Mohit Agarwal", "9876543220", "mohit@example.com", "Bhopal", "Aadhar", "AADHAR-1011", "Male", "34"},
                {"Pooja Singh", "9876543221", "pooja@example.com", "Kanpur", "Aadhar", "AADHAR-1012", "Female", "31"},
                {"Arjun Malhotra", "9876543222", "arjun@example.com", "Gurgaon", "PAN Card", "PAN-1013", "Male", "36"},
                {"Ishita Arora", "9876543223", "ishita@example.com", "Faridabad", "Aadhar", "AADHAR-1014", "Female", "24"},
                {"Yash Raj", "9876543224", "yash@example.com", "Ranchi", "Driving License", "DL-1015", "Male", "29"},
        };
        for (String[] d : data) {
            Customer c = new Customer();
            c.setName(d[0]); c.setPhone(d[1]); c.setEmail(d[2]); c.setAddress(d[3]);
            c.setIdProofType(d[4]); c.setIdProofNumber(d[5]); c.setGender(d[6]); c.setAge(Integer.parseInt(d[7]));
            customerRepository.save(c);
        }
    }

    private void seedEmployees() {
        Object[][] emps = {
                {"Rohit Sharma", "9876543210", "rohit@hotel.com", "Manager", "Management", 55000, "Morning", "2023-01-15"},
                {"Anita Verma", "9876500001", "anita@hotel.com", "Receptionist", "Front Desk", 28000, "Morning", "2023-03-20"},
                {"Rahul Meena", "9876500002", "rahul@hotel.com", "Housekeeping", "Housekeeping", 20000, "Evening", "2023-05-10"},
                {"Pooja Singh", "9876500003", "pooja@hotel.com", "Chef", "Kitchen", 35000, "Night", "2022-11-01"},
                {"Suresh Kumar", "9876500004", "suresh@hotel.com", "Maintenance", "Maintenance", 22000, "Day", "2024-02-14"},
                {"Neha Kapoor", "9876500005", "neha@hotel.com", "Receptionist", "Front Desk", 26000, "Evening", "2024-06-01"},
                {"Vikram Das", "9876500006", "vikram@hotel.com", "Housekeeping", "Housekeeping", 19000, "Morning", "2024-08-15"},
        };
        for (Object[] e : emps) {
            Employee emp = new Employee();
            emp.setName((String) e[0]); emp.setPhone((String) e[1]); emp.setEmail((String) e[2]);
            emp.setRole((String) e[3]); emp.setDepartment((String) e[4]); emp.setSalary(((Number) e[5]).doubleValue());
            emp.setShift((String) e[6]); emp.setJoiningDate(LocalDate.parse((String) e[7]));
            emp.setStatus("Active");
            employeeRepository.save(emp);
        }
    }

    private void seedInventory() {
        Object[][] items = {
                {"Water Bottle", "Beverages", 100, "pcs", 30, 20, "Aqua Supplies"},
                {"Soap", "Toiletries", 8, "pcs", 15, 20, "CleanCo"},
                {"Shampoo", "Toiletries", 45, "pcs", 20, 20, "CleanCo"},
                {"Towel", "Linens", 60, "pcs", 150, 10, "Linen World"},
                {"Bedsheet", "Linens", 5, "pcs", 350, 10, "Linen World"},
                {"Tea Kit", "Room Service", 100, "pcs", 50, 20, "FoodMart"},
        };
        for (Object[] i : items) {
            InventoryItem item = new InventoryItem();
            item.setItemName((String) i[0]); item.setCategory((String) i[1]);
            item.setQuantity((Integer) i[2]); item.setUnit((String) i[3]);
            item.setPrice(((Number) i[4]).doubleValue()); item.setReorderLevel((Integer) i[5]);
            item.setSupplierName((String) i[6]); item.setLastUpdated(LocalDate.now());
            inventoryRepository.save(item);
        }
    }

    private void seedBookings() {
        List<Customer> customers = customerRepository.findAll();
        List<Room> rooms = roomRepository.findAll();
        LocalDate today = LocalDate.now();

        Object[][] bookings = {
                {0, 0, "2026-06-25", "2026-06-30", BookingStatus.CHECKED_IN, PaymentStatus.PARTIAL},
                {1, 1, "2026-06-26", "2026-07-01", BookingStatus.CHECKED_IN, PaymentStatus.PAID},
                {2, 2, "2026-06-20", "2026-06-24", BookingStatus.CHECKED_OUT, PaymentStatus.PAID},
                {3, 3, "2026-06-28", "2026-07-03", BookingStatus.RESERVED, PaymentStatus.PENDING},
                {4, 4, "2026-06-27", "2026-06-29", BookingStatus.CHECKED_IN, PaymentStatus.PENDING},
                {5, 5, "2026-06-15", "2026-06-18", BookingStatus.CHECKED_OUT, PaymentStatus.PAID},
                {6, 10, "2026-06-29", "2026-07-02", BookingStatus.RESERVED, PaymentStatus.PENDING},
                {7, 11, "2026-06-30", "2026-07-04", BookingStatus.RESERVED, PaymentStatus.PENDING},
                {8, 12, "2026-06-28", "2026-07-01", BookingStatus.CHECKED_IN, PaymentStatus.PARTIAL},
                {9, 13, today.toString(), today.plusDays(3).toString(), BookingStatus.CHECKED_IN, PaymentStatus.PENDING},
        };

        for (Object[] b : bookings) {
            Customer c = customers.get((Integer) b[0]);
            Room r = rooms.get((Integer) b[1]);
            Booking bk = new Booking();
            bk.setCustomer(c);
            bk.setRoom(r);
            bk.setCheckin(LocalDate.parse((String) b[2]));
            bk.setCheckout(LocalDate.parse((String) b[3]));
            bk.setNumGuests(2);
            bk.setStatus((BookingStatus) b[4]);
            bk.setPaymentStatus((PaymentStatus) b[5]);
            bk.setTotalAmount(7500.0);
            bookingRepository.save(bk);

            if (bk.getStatus() == BookingStatus.CHECKED_IN) r.setStatus(RoomStatus.OCCUPIED);
            else if (bk.getStatus() == BookingStatus.RESERVED) r.setStatus(RoomStatus.RESERVED);
            else if (bk.getStatus() == BookingStatus.CHECKED_OUT) r.setStatus(RoomStatus.CLEANING);
            roomRepository.save(r);
        }
    }

    private void seedPayments() {
        bookingRepository.findAll().stream()
                .filter(b -> b.getPaymentStatus() != PaymentStatus.PENDING)
                .forEach(b -> {
                    Payment p = new Payment();
                    p.setBooking(b);
                    p.setAmount(b.getPaymentStatus() == PaymentStatus.PAID ? b.getTotalAmount() : b.getTotalAmount() * 0.5);
                    p.setPaymentMode("UPI");
                    p.setReceiptNumber("RCP-SEED-" + b.getId());
                    p.setPaymentDate(LocalDateTime.now());
                    paymentRepository.save(p);
                });
    }

    private void seedHousekeeping() {
        roomRepository.findByStatus(RoomStatus.CLEANING).stream().limit(2).forEach(room -> {
            HousekeepingTask t = new HousekeepingTask();
            t.setRoom(room);
            employeeRepository.findByDepartmentAndStatus("Housekeeping", "Active").stream().findFirst().ifPresent(t::setAssignedTo);
            t.setStatus("Pending");
            t.setPriority("High");
            t.setNotes("Post checkout cleaning");
            t.setCreatedAt(LocalDateTime.now());
            housekeepingTaskRepository.save(t);
        });
    }

    private void seedRoomService() {
        bookingRepository.findByStatusOrderByIdDesc(BookingStatus.CHECKED_IN).stream().limit(2).forEach(b -> {
            RoomServiceRequest rs = new RoomServiceRequest();
            rs.setBooking(b);
            rs.setRoom(b.getRoom());
            rs.setRequestType("Food");
            rs.setDescription("Guest room service request");
            rs.setStatus("Pending");
            rs.setCharges(250.0);
            rs.setAddToBill(true);
            rs.setCreatedAt(LocalDateTime.now());
            roomServiceRequestRepository.save(rs);
        });
    }
}
