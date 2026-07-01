package com.hms.service;

import com.hms.dto.DashboardStats;
import com.hms.dto.LoginRequest;
import com.hms.dto.LoginResponse;
import com.hms.entity.*;
import com.hms.repository.*;
import com.hms.security.JwtUtil;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.List;

@Service
@Transactional
public class HmsService {

    public static final List<BookingStatus> ACTIVE = List.of(BookingStatus.RESERVED, BookingStatus.CHECKED_IN);

    private final UserRepository userRepository;
    private final RoomRepository roomRepository;
    private final GuestRepository guestRepository;
    private final GuestMemberRepository guestMemberRepository;
    private final BookingRepository bookingRepository;
    private final PaymentRepository paymentRepository;
    private final InvoiceRepository invoiceRepository;
    private final StaffRepository staffRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    public HmsService(UserRepository userRepository, RoomRepository roomRepository,
                      GuestRepository guestRepository, GuestMemberRepository guestMemberRepository,
                      BookingRepository bookingRepository, PaymentRepository paymentRepository,
                      InvoiceRepository invoiceRepository, StaffRepository staffRepository,
                      PasswordEncoder passwordEncoder, JwtUtil jwtUtil) {
        this.userRepository = userRepository;
        this.roomRepository = roomRepository;
        this.guestRepository = guestRepository;
        this.guestMemberRepository = guestMemberRepository;
        this.bookingRepository = bookingRepository;
        this.paymentRepository = paymentRepository;
        this.invoiceRepository = invoiceRepository;
        this.staffRepository = staffRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtil = jwtUtil;
    }

    public LoginResponse login(LoginRequest req) {
        User user = userRepository.findByUsernameAndStatus(req.username(), "Active")
                .orElseThrow(() -> new IllegalArgumentException("Invalid credentials"));
        if (!passwordEncoder.matches(req.password(), user.getPassword()))
            throw new IllegalArgumentException("Invalid credentials");
        String token = jwtUtil.generateToken(user.getUsername(), user.getRole().name());
        return new LoginResponse(token, user.getUsername(),
                user.getFullName() != null ? user.getFullName() : user.getUsername(),
                user.getRole().name());
    }

    public DashboardStats dashboardStats() {
        return new DashboardStats(
                roomRepository.count(),
                roomRepository.countByStatus(RoomStatus.AVAILABLE),
                roomRepository.countByStatus(RoomStatus.OCCUPIED),
                bookingRepository.countByStatusIn(ACTIVE),
                staffRepository.countByStatus("Active"),
                paymentRepository.totalRevenue(),
                roomRepository.countByStatus(RoomStatus.CLEANING)
        );
    }

    private long nights(LocalDate in, LocalDate out) {
        return Math.max(ChronoUnit.DAYS.between(in, out), 1);
    }

    public double bookingTotal(Booking b) {
        return nights(b.getCheckin(), b.getCheckout()) * b.getRoom().getPrice();
    }

    public double paidAmount(Long bookingId) {
        return paymentRepository.sumByBooking(bookingId);
    }

    public Booking createBooking(Long guestId, Long roomId, LocalDate checkin, LocalDate checkout, int numGuests) {
        if (!checkout.isAfter(checkin)) throw new IllegalArgumentException("Check-out must be after check-in");
        if (bookingRepository.hasOverlap(roomId, checkin, checkout, ACTIVE, null))
            throw new IllegalStateException("Room already booked for overlapping dates");
        Guest guest = guestRepository.findById(guestId).orElseThrow();
        Room room = roomRepository.findById(roomId).orElseThrow();
        if (numGuests > room.getCapacity()) throw new IllegalArgumentException("Exceeds room capacity");
        Booking b = new Booking();
        b.setGuest(guest);
        b.setRoom(room);
        b.setCheckin(checkin);
        b.setCheckout(checkout);
        b.setNumGuests(numGuests);
        b.setStatus(BookingStatus.RESERVED);
        b.setPaymentStatus(PaymentStatus.PENDING);
        b.setTotalAmount(nights(checkin, checkout) * room.getPrice());
        bookingRepository.save(b);
        room.setStatus(RoomStatus.RESERVED);
        roomRepository.save(room);
        return b;
    }

    public Booking checkIn(Long id) {
        Booking b = bookingRepository.findById(id).orElseThrow();
        if (b.getStatus() != BookingStatus.RESERVED) throw new IllegalStateException("Invalid booking for check-in");
        b.setStatus(BookingStatus.CHECKED_IN);
        b.getRoom().setStatus(RoomStatus.OCCUPIED);
        roomRepository.save(b.getRoom());
        return bookingRepository.save(b);
    }

    public Invoice checkOut(Long id, double discount, double paymentAmount, String mode, boolean allowPending) {
        Booking b = bookingRepository.findById(id).orElseThrow();
        if (b.getStatus() != BookingStatus.CHECKED_IN) throw new IllegalStateException("Invalid booking for check-out");
        double roomCharges = nights(b.getCheckin(), b.getCheckout()) * b.getRoom().getPrice();
        double subtotal = Math.max(roomCharges - discount, 0);
        double tax = subtotal * 0.12;
        double total = subtotal + tax;
        if (paymentAmount > 0) addPayment(b.getId(), paymentAmount, mode, "Checkout payment");
        double paid = paidAmount(id);
        double balance = Math.max(total - paid, 0);
        if (balance > 0 && !allowPending) throw new IllegalStateException("Pending balance: Rs." + balance);
        b.setStatus(BookingStatus.CHECKED_OUT);
        b.setTotalAmount(total);
        b.setPaymentStatus(balance <= 0 ? PaymentStatus.PAID : PaymentStatus.PARTIAL);
        bookingRepository.save(b);
        b.getRoom().setStatus(RoomStatus.CLEANING);
        roomRepository.save(b.getRoom());
        Invoice inv = new Invoice();
        inv.setBooking(b);
        inv.setRoomCharges(roomCharges);
        inv.setServiceCharges(0.0);
        inv.setTax(tax);
        inv.setDiscount(discount);
        inv.setTotal(total);
        inv.setPaymentStatus(b.getPaymentStatus());
        return invoiceRepository.save(inv);
    }

    public Payment addPayment(Long bookingId, double amount, String mode, String notes) {
        Booking b = bookingRepository.findById(bookingId).orElseThrow();
        Payment p = new Payment();
        p.setBooking(b);
        p.setAmount(amount);
        p.setPaymentMode(mode);
        p.setReceiptNumber("RCP-" + LocalDate.now().format(DateTimeFormatter.BASIC_ISO_DATE) + "-" + (paymentRepository.count() + 1));
        p.setPaymentDate(Instant.now());
        p.setNotes(notes);
        paymentRepository.save(p);
        double total = bookingTotal(b);
        double paid = paidAmount(bookingId);
        if (paid <= 0) b.setPaymentStatus(PaymentStatus.PENDING);
        else if (paid >= total) b.setPaymentStatus(PaymentStatus.PAID);
        else b.setPaymentStatus(PaymentStatus.PARTIAL);
        bookingRepository.save(b);
        return p;
    }

    public void cancelBooking(Long id) {
        Booking b = bookingRepository.findById(id).orElseThrow();
        if (ACTIVE.contains(b.getStatus())) {
            b.setStatus(BookingStatus.CANCELLED);
            bookingRepository.save(b);
            b.getRoom().setStatus(RoomStatus.AVAILABLE);
            roomRepository.save(b.getRoom());
        }
    }
}
