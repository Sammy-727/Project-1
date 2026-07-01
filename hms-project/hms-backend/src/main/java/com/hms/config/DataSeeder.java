package com.hms.config;

import com.hms.entity.*;
import com.hms.repository.*;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.List;

@Component
public class DataSeeder implements CommandLineRunner {

    private final UserRepository userRepository;
    private final RoomRepository roomRepository;
    private final GuestRepository guestRepository;
    private final BookingRepository bookingRepository;
    private final PaymentRepository paymentRepository;
    private final StaffRepository staffRepository;
    private final PasswordEncoder passwordEncoder;

    public DataSeeder(UserRepository userRepository, RoomRepository roomRepository,
                      GuestRepository guestRepository, BookingRepository bookingRepository,
                      PaymentRepository paymentRepository, StaffRepository staffRepository,
                      PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.roomRepository = roomRepository;
        this.guestRepository = guestRepository;
        this.bookingRepository = bookingRepository;
        this.paymentRepository = paymentRepository;
        this.staffRepository = staffRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) {
        if (userRepository.count() > 0) return;
        seedUsers();
        seedRooms();
        seedGuests();
        seedStaff();
        seedBookings();
    }

    private void seedUsers() {
        createUser("admin", "admin123", "Hotel Admin", UserRole.ADMIN);
        createUser("manager", "manager123", "Manager", UserRole.MANAGER);
        createUser("reception", "rec123", "Receptionist", UserRole.RECEPTIONIST);
    }

    private void createUser(String u, String p, String name, UserRole role) {
        User user = new User();
        user.setUsername(u);
        user.setPassword(passwordEncoder.encode(p));
        user.setFullName(name);
        user.setRole(role);
        userRepository.save(user);
    }

    private void seedRooms() {
        for (int i = 101; i <= 110; i++) addRoom(String.valueOf(i), "Standard", 1, 1500.0);
        for (int i = 201; i <= 210; i++) addRoom(String.valueOf(i), "Deluxe", 2, 3000.0);
        for (int i = 301; i <= 308; i++) addRoom(String.valueOf(i), "Super Deluxe", 3, 5000.0);
    }

    private void addRoom(String no, String type, int floor, double price) {
        Room r = new Room();
        r.setRoomNo(no);
        r.setRoomType(type);
        r.setFloor(floor);
        r.setPrice(price);
        r.setCapacity(2);
        r.setStatus(RoomStatus.AVAILABLE);
        roomRepository.save(r);
    }

    private void seedGuests() {
        String[][] data = {
            {"Ayush Sharma", "9876543210", "ayush@example.com"},
            {"Priya Mehta", "9876543211", "priya@example.com"},
            {"Rohan Verma", "9876543212", "rohan@example.com"},
            {"Sneha Kapoor", "9876543213", "sneha@example.com"},
            {"Karan Singh", "9876543214", "karan@example.com"},
        };
        for (String[] d : data) {
            Guest g = new Guest();
            g.setName(d[0]);
            g.setPhone(d[1]);
            g.setEmail(d[2]);
            guestRepository.save(g);
        }
    }

    private void seedStaff() {
        Staff s = new Staff();
        s.setName("Rohit Sharma");
        s.setRole("Manager");
        s.setDepartment("Management");
        s.setSalary(55000.0);
        s.setJoiningDate(LocalDate.of(2023, 1, 15));
        staffRepository.save(s);
    }

    private void seedBookings() {
        List<Guest> guests = guestRepository.findAll();
        List<Room> rooms = roomRepository.findAll();
        if (guests.isEmpty() || rooms.size() < 3) return;
        LocalDate today = LocalDate.now();
        Booking b1 = new Booking();
        b1.setGuest(guests.get(0));
        b1.setRoom(rooms.get(0));
        b1.setCheckin(today.minusDays(1));
        b1.setCheckout(today.plusDays(2));
        b1.setNumGuests(2);
        b1.setStatus(BookingStatus.CHECKED_IN);
        b1.setTotalAmount(4500.0);
        b1.setPaymentStatus(PaymentStatus.PARTIAL);
        bookingRepository.save(b1);
        rooms.get(0).setStatus(RoomStatus.OCCUPIED);
        roomRepository.save(rooms.get(0));
    }
}
