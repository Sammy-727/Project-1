package com.hms.controller;

import com.hms.dto.*;
import com.hms.entity.*;
import com.hms.repository.*;
import com.hms.service.HmsService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.*;

@RestController
@RequestMapping("/api")
public class ApiControllers {

    @RestController
    @RequestMapping("/api/auth")
    public static class AuthController {
        private final HmsService hmsService;
        public AuthController(HmsService hmsService) { this.hmsService = hmsService; }
        @PostMapping("/login")
        public LoginResponse login(@RequestBody LoginRequest req) { return hmsService.login(req); }
    }

    @RestController
    @RequestMapping("/api/dashboard")
    public static class DashboardController {
        private final HmsService hmsService;
        private final BookingRepository bookingRepository;
        private final PaymentRepository paymentRepository;
        public DashboardController(HmsService hmsService, BookingRepository bookingRepository, PaymentRepository paymentRepository) {
            this.hmsService = hmsService; this.bookingRepository = bookingRepository; this.paymentRepository = paymentRepository;
        }
        @GetMapping("/stats")
        public DashboardStats stats() { return hmsService.dashboardStats(); }
        @GetMapping("/recent-bookings")
        public List<Booking> recentBookings() { return bookingRepository.findTop10ByOrderByIdDesc(); }
        @GetMapping("/recent-payments")
        public List<Payment> recentPayments() { return paymentRepository.findAllByOrderByPaymentDateDesc().stream().limit(8).toList(); }
    }

    @RestController
    @RequestMapping("/api/rooms")
    public static class RoomController {
        private final RoomRepository roomRepository;
        public RoomController(RoomRepository roomRepository) { this.roomRepository = roomRepository; }
        @GetMapping
        public List<Room> list(@RequestParam(required = false) String q,
                               @RequestParam(required = false) RoomStatus status) {
            List<Room> all = q != null && !q.isBlank() ?
                    roomRepository.findByRoomNoContainingIgnoreCaseOrRoomTypeContainingIgnoreCase(q, q) :
                    roomRepository.findAll();
            if (status != null) all = all.stream().filter(r -> r.getStatus() == status).toList();
            return all;
        }
        @GetMapping("/types")
        public List<String> types() { return roomRepository.findDistinctTypes(); }
        @PostMapping
        public Room create(@RequestBody Room room) { return roomRepository.save(room); }
        @PutMapping("/{id}")
        public Room update(@PathVariable Long id, @RequestBody Room room) {
            room.setId(id);
            return roomRepository.save(room);
        }
        @DeleteMapping("/{id}")
        public MessageResponse delete(@PathVariable Long id) {
            roomRepository.deleteById(id);
            return new MessageResponse("Room deleted");
        }
    }

    @RestController
    @RequestMapping("/api/guests")
    public static class GuestController {
        private final GuestRepository guestRepository;
        public GuestController(GuestRepository guestRepository) { this.guestRepository = guestRepository; }
        @GetMapping
        public List<Guest> list(@RequestParam(required = false) String q) {
            return q != null && !q.isBlank() ?
                    guestRepository.findByNameContainingIgnoreCaseOrPhoneContainingIgnoreCaseOrEmailContainingIgnoreCase(q, q, q) :
                    guestRepository.findAll();
        }
        @GetMapping("/{id}")
        public Guest get(@PathVariable Long id) { return guestRepository.findById(id).orElseThrow(); }
        @PostMapping
        public Guest create(@RequestBody Guest guest) { return guestRepository.save(guest); }
        @PutMapping("/{id}")
        public Guest update(@PathVariable Long id, @RequestBody Guest guest) {
            guest.setId(id);
            return guestRepository.save(guest);
        }
        @DeleteMapping("/{id}")
        public MessageResponse delete(@PathVariable Long id) {
            guestRepository.deleteById(id);
            return new MessageResponse("Guest deleted");
        }
    }

    @RestController
    @RequestMapping("/api/bookings")
    public static class BookingController {
        private final BookingRepository bookingRepository;
        private final HmsService hmsService;
        public BookingController(BookingRepository bookingRepository, HmsService hmsService) {
            this.bookingRepository = bookingRepository; this.hmsService = hmsService;
        }
        @GetMapping
        public List<Booking> list(@RequestParam(required = false) BookingStatus status) {
            if (status != null) return bookingRepository.findByStatusOrderByCheckinAsc(status);
            return bookingRepository.findAllByOrderByIdDesc();
        }
        @GetMapping("/arrivals")
        public List<Booking> arrivals() {
            return bookingRepository.findArrivals(BookingStatus.RESERVED, LocalDate.now());
        }
        @GetMapping("/active")
        public List<Booking> active() {
            return bookingRepository.findByStatusOrderByCheckinAsc(BookingStatus.CHECKED_IN);
        }
        @PostMapping
        public Booking create(@RequestBody BookingRequest req) {
            return hmsService.createBooking(req.guestId(), req.roomId(),
                    LocalDate.parse(req.checkin()), LocalDate.parse(req.checkout()), req.numGuests());
        }
        @PostMapping("/{id}/checkin")
        public Booking checkIn(@PathVariable Long id) { return hmsService.checkIn(id); }
        @PostMapping("/{id}/checkout")
        public Invoice checkOut(@PathVariable Long id, @RequestBody CheckoutRequest req) {
            return hmsService.checkOut(id, req.discount(), req.paymentAmount(), req.paymentMode(), req.allowPending());
        }
        @PostMapping("/{id}/cancel")
        public MessageResponse cancel(@PathVariable Long id) {
            hmsService.cancelBooking(id);
            return new MessageResponse("Booking cancelled");
        }
    }

    @RestController
    @RequestMapping("/api/payments")
    public static class PaymentController {
        private final PaymentRepository paymentRepository;
        private final HmsService hmsService;
        public PaymentController(PaymentRepository paymentRepository, HmsService hmsService) {
            this.paymentRepository = paymentRepository; this.hmsService = hmsService;
        }
        @GetMapping
        public List<Payment> list() { return paymentRepository.findAllByOrderByPaymentDateDesc(); }
        @GetMapping("/revenue")
        public Map<String, Double> revenue() { return Map.of("total", paymentRepository.totalRevenue()); }
        @PostMapping
        public Payment create(@RequestBody PaymentRequest req) {
            return hmsService.addPayment(req.bookingId(), req.amount(), req.paymentMode(), req.notes());
        }
    }

    @RestController
    @RequestMapping("/api/reports")
    public static class ReportController {
        private final PaymentRepository paymentRepository;
        private final BookingRepository bookingRepository;
        private final RoomRepository roomRepository;
        public ReportController(PaymentRepository paymentRepository, BookingRepository bookingRepository, RoomRepository roomRepository) {
            this.paymentRepository = paymentRepository; this.bookingRepository = bookingRepository; this.roomRepository = roomRepository;
        }
        @GetMapping("/summary")
        public Map<String, Object> summary() {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("revenue", paymentRepository.totalRevenue());
            m.put("totalBookings", bookingRepository.count());
            m.put("totalRooms", roomRepository.count());
            m.put("occupiedRooms", roomRepository.countByStatus(RoomStatus.OCCUPIED));
            m.put("availableRooms", roomRepository.countByStatus(RoomStatus.AVAILABLE));
            return m;
        }
    }

    @RestController
    @RequestMapping("/api/staff")
    public static class StaffController {
        private final StaffRepository staffRepository;
        public StaffController(StaffRepository staffRepository) { this.staffRepository = staffRepository; }
        @GetMapping
        public List<Staff> list() { return staffRepository.findAll(); }
        @PostMapping
        public Staff create(@RequestBody Staff staff) { return staffRepository.save(staff); }
    }

    @RestControllerAdvice
    public static class GlobalExceptionHandler {
        @ExceptionHandler(IllegalArgumentException.class)
        public ResponseEntity<MessageResponse> badRequest(IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(new MessageResponse(e.getMessage()));
        }
        @ExceptionHandler(IllegalStateException.class)
        public ResponseEntity<MessageResponse> conflict(IllegalStateException e) {
            return ResponseEntity.status(409).body(new MessageResponse(e.getMessage()));
        }
    }
}
