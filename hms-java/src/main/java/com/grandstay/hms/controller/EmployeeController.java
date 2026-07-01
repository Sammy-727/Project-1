package com.grandstay.hms.controller;

import com.grandstay.hms.model.Employee;
import com.grandstay.hms.repository.EmployeeRepository;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

@Controller
@RequestMapping("/employees")
public class EmployeeController {

    private final EmployeeRepository employeeRepository;

    public EmployeeController(EmployeeRepository employeeRepository) {
        this.employeeRepository = employeeRepository;
    }

    @GetMapping
    public String list(@RequestParam(required = false) String q, Model model) {
        model.addAttribute("title", "Employees");
        if (q != null && !q.isBlank())
            model.addAttribute("employees", employeeRepository
                    .findByNameContainingIgnoreCaseOrEmailContainingIgnoreCaseOrDepartmentContainingIgnoreCase(q, q, q));
        else
            model.addAttribute("employees", employeeRepository.findAll());
        return "employees";
    }

    @PostMapping("/add")
    public String add(@ModelAttribute Employee employee, RedirectAttributes ra) {
        employeeRepository.save(employee);
        ra.addFlashAttribute("success", "Employee added.");
        return "redirect:/employees";
    }

    @PostMapping("/update/{id}")
    public String update(@PathVariable Long id, @ModelAttribute Employee employee, RedirectAttributes ra) {
        employee.setId(id);
        employeeRepository.save(employee);
        ra.addFlashAttribute("success", "Employee updated.");
        return "redirect:/employees";
    }

    @PostMapping("/delete/{id}")
    public String delete(@PathVariable Long id, RedirectAttributes ra) {
        employeeRepository.deleteById(id);
        ra.addFlashAttribute("success", "Employee deleted.");
        return "redirect:/employees";
    }
}
