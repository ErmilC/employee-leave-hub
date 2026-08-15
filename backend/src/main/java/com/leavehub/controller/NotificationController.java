package com.leavehub.controller;

import com.leavehub.entity.DemoEmail;
import com.leavehub.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class NotificationController {

    private final NotificationService notificationService;

    @GetMapping
    public ResponseEntity<List<DemoEmail>> getAllNotifications() {
        return ResponseEntity.ok(notificationService.getAllNotifications());
    }

    @GetMapping("/user")
    public ResponseEntity<List<DemoEmail>> getUserNotifications(
            org.springframework.security.core.Authentication authentication,
            @RequestParam(required = false) String email) {

        if (authentication == null || authentication.getName() == null || !authentication.isAuthenticated()
                || "anonymousUser".equalsIgnoreCase(authentication.getName())) {
            return ResponseEntity.status(org.springframework.http.HttpStatus.UNAUTHORIZED).build();
        }

        String authEmail = authentication.getName();
        boolean isAdmin = authentication.getAuthorities().stream()
                .anyMatch(a -> "ROLE_ADMIN".equalsIgnoreCase(a.getAuthority()));

        String targetEmail = (isAdmin && email != null && !email.isBlank()) ? email.trim() : authEmail;

        return ResponseEntity.ok(notificationService.getNotificationsForUser(targetEmail));
    }
}
