package com.leavehub.service;

import com.leavehub.entity.DemoEmail;
import com.leavehub.repository.DemoEmailRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class NotificationService {

    private final DemoEmailRepository demoEmailRepository;

    public void sendDemoEmail(String recipientEmail, String recipientName, String subject, String content, String type) {
        if (recipientEmail == null || recipientEmail.isBlank()) {
            return;
        }
        DemoEmail email = new DemoEmail(
                UUID.randomUUID().toString(),
                "sistem@test.ro",
                recipientEmail.trim(),
                recipientName != null ? recipientName.trim() : recipientEmail.trim(),
                subject != null ? subject : "Notificare Concediu",
                content != null ? content : "",
                LocalDateTime.now(),
                type != null ? type : "INFO"
        );
        demoEmailRepository.save(email);
    }

    public List<DemoEmail> getAllNotifications() {
        return demoEmailRepository.findAllByOrderBySentAtDesc();
    }

    public List<DemoEmail> getNotificationsForUser(String recipientEmail) {
        return demoEmailRepository.findByRecipientEmailIgnoreCaseOrderBySentAtDesc(recipientEmail);
    }
}
