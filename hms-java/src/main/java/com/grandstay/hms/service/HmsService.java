package com.grandstay.hms.service;

import com.grandstay.hms.model.*;
import com.grandstay.hms.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.*;

@Service
@Transactional
public class HmsService {

    private final RoomRepository roomRepository;
    private final CustomerRepository customerRepository;
    private final GuestRepository guestRepository;
    private final BookingRepository bookingRepository;
    private final PaymentRepository paymentRepository;
    private final EmployeeRepository employeeRepository;
    private final HousekeepingTaskRepository housekeepingTaskRepository;
    private final RoomServiceRequestRepository roomServiceRequestRepository;
    private final InventoryRepository inventoryRepository;
    private final UserRepository userRepository;

    public HmsService(RoomRepository roomRepository, CustomerRepository customerRepository,
                      GuestRepository guestRepository, BookingRepository bookingRepository,
                      PaymentRepository paymentRepository, EmployeeRepository employeeRepository,
                      HousekeepingTaskRepository housekeepingTaskRepository,
                      RoomServiceRequestRepository roomServiceRequestRepository,
                      InventoryRepository inventoryRepository, UserRepository userRepository) {
        this.roomRepository = roomRepository;
        this.customerRepository = customerRepository;
        this.guestRepository = guestRepository;
        this.bookingRepository = bookingRepository;
        this.paymentRepository = paymentRepository;
        this.employeeRepository = employeeRepository;
        this.housekeepingTaskRepository = housekeepingTaskRepository;
        this.roomServiceRequestRepository = roomServiceRequestRepository;
        this.inventoryRepository = inventoryRepository;
        this.userRepository = userRepository;
    }

    public static final List<BookingStatus> ACTIVE_BOOKING = List.of(BookingStatus.RESERVED, BookingStatus.CHECKED_IN);

    public long nights(LocalDate checkin, LocalDate checkout) {
        long days = ChronoUnit.DAYS.between(checkin, checkout);
        return Math.max(days, 1);
    }

    public double calcRoomCharges(double price, LocalDate checkin, LocalDate checkout) {
        return nights(checkin, checkout) * price;
    }

    public double serviceCharges(Long bookingId) {
        return roomServiceRequestRepository.findByBookingIdAndAddToBillTrueAndStatusNot(bookingId, "Cancelled")
                .stream().mapToDouble(r -> r.getCharges() != null ? r.getCharges() : 0).sum();
    }

    public double bookingTotal(Booking booking) {
        double room = calcRoomCharges(booking.getRoom().getPrice(), booking.getCheckin(), booking.getCheckout());
        return room + serviceCharges(booking.getId());
    }

    public double paidAmount(Long bookingId) {
        return paymentRepository.sumByBookingId(bookingId);
    }

    public void updatePaymentStatus(Booking booking) {
        double total = bookingTotal(booking);
        double paid = paidAmount(booking.getId());
        booking.setTotalAmount(total);
        if (paid <= 0) booking.setPaymentStatus(PaymentStatus.PENDING);
        else if (paid >= total) booking.setPaymentStatus(PaymentStatus.PAID);
        else booking.setPaymentStatus(PaymentStatus.PARTIAL);
        bookingRepository.save(booking);
    }

    public boolean hasOverlap(Long roomId, LocalDate checkin, LocalDate checkout, Long excludeId) {
        return bookingRepository.hasOverlap(roomId, checkin, checkout, ACTIVE_BOOKING, excludeId);
    }

    public String nextReceipt() {
        long count = paymentRepository.count();
        return String.format("RCP-%s-%04d", LocalDate.now().toString().replace("-", ""), count + 1);
    }

    public Map<String, Object> dashboardStats() {
        Map<String, Object> stats = new LinkedHashMap<>();
        stats.put("totalRooms", roomRepository.count());
        stats.put("available", roomRepository.countByStatus(RoomStatus.AVAILABLE));
        stats.put("occupied", roomRepository.countByStatus(RoomStatus.OCCUPIED));
        stats.put("activeBookings", bookingRepository.countByStatusIn(ACTIVE_BOOKING));
        stats.put("employees", employeeRepository.countByStatus("Active"));
        stats.put("revenue", paymentRepository.totalRevenue());
        stats.put("cleaning", roomRepository.countByStatus(RoomStatus.CLEANING));
        return stats;
    }

    public Map<String, Long> roomStatusSummary() {
        Map<String, Long> map = new LinkedHashMap<>();
        for (RoomStatus s : RoomStatus.values()) {
            long c = roomRepository.countByStatus(s);
            if (c > 0) map.put(s.name().replace('_', ' '), c);
        }
        return map;
    }

    // --- Rooms ---
    public List<Room> searchRooms(String q, String status, String type) {
        List<Room> all = roomRepository.findAll();
        return all.stream()
                .filter(r -> status == null || status.isBlank() || r.getStatus().name().equals(status))
                .filter(r -> type == null || type.isBlank() || type.equals(r.getRoomType()))
                .filter(r -> q == null || q.isBlank() ||
                        r.getRoomNo().toLowerCase().contains(q.toLowerCase()) ||
                        (r.getRoomType() != null && r.getRoomType().toLowerCase().contains(q.toLowerCase())))
                .sorted(Comparator.comparing(Room::getRoomNo))
                .toList();
    }

    public Room saveRoom(Room room) { return roomRepository.save(room); }

    public Optional<Room> getRoom(Long id) { return roomRepository.findById(id); }

    public void deleteRoom(Long id) {
        if (bookingRepository.countByRoomIdAndStatusIn(id, ACTIVE_BOOKING) > 0)
            throw new IllegalStateException("Cannot delete room with active bookings");
        roomRepository.deleteById(id);
    }

    // --- Customers ---
    public List<Customer> searchCustomers(String q) {
        if (q == null || q.isBlank()) return customerRepository.findAll();
        return customerRepository.findByNameContainingIgnoreCaseOrPhoneContainingIgnoreCaseOrEmailContainingIgnoreCase(q, q, q);
    }

    public Customer saveCustomer(Customer c, List<String> guestNames) {
        Customer saved = customerRepository.save(c);
        guestRepository.findByCustomerIdAndBookingIsNull(saved.getId()).forEach(guestRepository::delete);
        if (guestNames != null) {
            for (String gn : guestNames) {
                if (gn != null && !gn.isBlank()) {
                    Guest g = new Guest();
                    g.setCustomer(saved);
                    g.setName(gn.trim());
                    guestRepository.save(g);
                }
            }
        }
        return saved;
    }

    public Optional<Customer> getCustomer(Long id) { return customerRepository.findById(id); }

    public void deleteCustomer(Long id) {
        if (bookingRepository.countByCustomerId(id) > 0 &&
                bookingRepository.findAll().stream().anyMatch(b ->
                        b.getCustomer().getId().equals(id) && ACTIVE_BOOKING.contains(b.getStatus())))
            throw new IllegalStateException("Cannot delete customer with active bookings");
        customerRepository.deleteById(id);
    }

    public long bookingCount(Long customerId) {
        return bookingRepository.countByCustomerId(customerId);
    }

    // --- Bookings ---
    public Booking createBooking(Long customerId, Long roomId, LocalDate checkin, LocalDate checkout,
                                 int numGuests, List<String> guestNames) {
        if (!checkout.isAfter(checkin)) throw new IllegalArgumentException("Check-out must be after check-in");
        if (hasOverlap(roomId, checkin, checkout, null))
            throw new IllegalStateException("Room is already booked for overlapping dates");

        Customer customer = customerRepository.findById(customerId).orElseThrow();
        Room room = roomRepository.findById(roomId).orElseThrow();
        if (numGuests > room.getCapacity()) throw new IllegalArgumentException("Exceeds room capacity");

        Booking booking = new Booking();
        booking.setCustomer(customer);
        booking.setRoom(room);
        booking.setCheckin(checkin);
        booking.setCheckout(checkout);
        booking.setNumGuests(numGuests);
        booking.setStatus(BookingStatus.RESERVED);
        booking.setPaymentStatus(PaymentStatus.PENDING);
        booking.setTotalAmount(calcRoomCharges(room.getPrice(), checkin, checkout));
        booking = bookingRepository.save(booking);

        if (guestNames != null) {
            for (String gn : guestNames) {
                if (gn != null && !gn.isBlank()) {
                    Guest g = new Guest();
                    g.setCustomer(customer);
                    g.setBooking(booking);
                    g.setName(gn.trim());
                    guestRepository.save(g);
                }
            }
        }
        room.setStatus(RoomStatus.RESERVED);
        roomRepository.save(room);
        return booking;
    }

    public void cancelBooking(Long id) {
        Booking b = bookingRepository.findById(id).orElseThrow();
        if (ACTIVE_BOOKING.contains(b.getStatus())) {
            b.setStatus(BookingStatus.CANCELLED);
            bookingRepository.save(b);
            syncRoom(b.getRoom().getId());
        }
    }

    public void checkIn(Long id) {
        Booking b = bookingRepository.findById(id).orElseThrow();
        if (b.getStatus() != BookingStatus.RESERVED) throw new IllegalStateException("Invalid booking for check-in");
        b.setStatus(BookingStatus.CHECKED_IN);
        bookingRepository.save(b);
        Room room = b.getRoom();
        room.setStatus(RoomStatus.OCCUPIED);
        roomRepository.save(room);
        updatePaymentStatus(b);
    }

    public void checkOut(Long id, double discount, double paymentAmount, String paymentMode, boolean allowPending) {
        Booking b = bookingRepository.findById(id).orElseThrow();
        if (b.getStatus() != BookingStatus.CHECKED_IN) throw new IllegalStateException("Invalid booking for check-out");

        double roomCharges = calcRoomCharges(b.getRoom().getPrice(), b.getCheckin(), b.getCheckout());
        double svc = serviceCharges(id);
        double subtotal = Math.max(roomCharges + svc - discount, 0);
        double tax = subtotal * 0.12;
        double total = subtotal + tax;

        if (paymentAmount > 0) {
            Payment p = new Payment();
            p.setBooking(b);
            p.setAmount(paymentAmount);
            p.setPaymentMode(paymentMode);
            p.setReceiptNumber(nextReceipt());
            p.setPaymentDate(LocalDateTime.now());
            p.setNotes("Checkout payment");
            paymentRepository.save(p);
        }

        double paid = paidAmount(id);
        double balance = Math.max(total - paid, 0);
        if (balance > 0 && !allowPending)
            throw new IllegalStateException("Pending balance: Rs." + String.format("%.2f", balance));

        b.setStatus(BookingStatus.CHECKED_OUT);
        b.setTotalAmount(total);
        b.setPaymentStatus(balance <= 0 ? PaymentStatus.PAID : PaymentStatus.PARTIAL);
        bookingRepository.save(b);

        Room room = b.getRoom();
        room.setStatus(RoomStatus.CLEANING);
        roomRepository.save(room);

        HousekeepingTask task = new HousekeepingTask();
        task.setRoom(room);
        employeeRepository.findByDepartmentAndStatus("Housekeeping", "Active").stream().findFirst()
                .ifPresent(task::setAssignedTo);
        task.setStatus("Pending");
        task.setPriority("High");
        task.setNotes("Post checkout cleaning");
        task.setCreatedAt(LocalDateTime.now());
        housekeepingTaskRepository.save(task);
    }

    public Payment addPayment(Long bookingId, double amount, String mode, String notes) {
        Booking b = bookingRepository.findById(bookingId).orElseThrow();
        Payment p = new Payment();
        p.setBooking(b);
        p.setAmount(amount);
        p.setPaymentMode(mode);
        p.setReceiptNumber(nextReceipt());
        p.setPaymentDate(LocalDateTime.now());
        p.setNotes(notes);
        paymentRepository.save(p);
        updatePaymentStatus(b);
        return p;
    }

    public void syncRoom(Long roomId) {
        Room room = roomRepository.findById(roomId).orElseThrow();
        if (room.getStatus() == RoomStatus.MAINTENANCE) return;

        Optional<Booking> active = bookingRepository.findAll().stream()
                .filter(b -> b.getRoom().getId().equals(roomId) && ACTIVE_BOOKING.contains(b.getStatus()))
                .max(Comparator.comparing(Booking::getId));

        if (active.isPresent()) {
            room.setStatus(active.get().getStatus() == BookingStatus.CHECKED_IN ?
                    RoomStatus.OCCUPIED : RoomStatus.RESERVED);
        } else {
            boolean hkPending = housekeepingTaskRepository.findAll().stream()
                    .anyMatch(t -> t.getRoom().getId().equals(roomId) && !"Completed".equals(t.getStatus()));
            room.setStatus(hkPending ? RoomStatus.CLEANING : RoomStatus.AVAILABLE);
        }
        roomRepository.save(room);
    }

    // --- Housekeeping ---
    public HousekeepingTask completeHousekeeping(Long taskId) {
        HousekeepingTask task = housekeepingTaskRepository.findById(taskId).orElseThrow();
        task.setStatus("Completed");
        task.setCompletedAt(LocalDateTime.now());
        housekeepingTaskRepository.save(task);
        Room room = task.getRoom();
        room.setStatus(RoomStatus.AVAILABLE);
        roomRepository.save(room);
        return task;
    }

    // --- Inventory ---
    public InventoryItem saveInventory(InventoryItem item) {
        item.setLastUpdated(LocalDate.now());
        return inventoryRepository.save(item);
    }

    public void restockInventory(Long id, int qty) {
        InventoryItem item = inventoryRepository.findById(id).orElseThrow();
        item.setQuantity(item.getQuantity() + qty);
        item.setLastUpdated(LocalDate.now());
        inventoryRepository.save(item);
    }

    // --- User ---
    public User saveUser(User user, String rawPassword) {
        user.setPassword(new org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder().encode(rawPassword));
        return userRepository.save(user);
    }
}
