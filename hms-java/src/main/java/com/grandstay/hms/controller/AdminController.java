package com.grandstay.hms.controller;

import com.grandstay.hms.model.User;
import com.grandstay.hms.model.UserRole;
import com.grandstay.hms.repository.UserRepository;
import com.grandstay.hms.service.HmsService;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

@Controller
@RequestMapping("/admin")
public class AdminController {

    private final UserRepository userRepository;
    private final HmsService hmsService;

    public AdminController(UserRepository userRepository, HmsService hmsService) {
        this.userRepository = userRepository;
        this.hmsService = hmsService;
    }

    @GetMapping
    public String list(Model model) {
        model.addAttribute("title", "User Management");
        model.addAttribute("users", userRepository.findAll());
        model.addAttribute("roles", UserRole.values());
        return "admin";
    }

    @PostMapping("/users/add")
    public String addUser(@RequestParam String username, @RequestParam String password,
                          @RequestParam(required = false) String fullName,
                          @RequestParam UserRole role, RedirectAttributes ra) {
        try {
            User u = new User();
            u.setUsername(username);
            u.setFullName(fullName != null ? fullName : username);
            u.setRole(role);
            u.setStatus("Active");
            hmsService.saveUser(u, password);
            ra.addFlashAttribute("success", "User added.");
        } catch (Exception e) {
            ra.addFlashAttribute("error", e.getMessage());
        }
        return "redirect:/admin";
    }
}
