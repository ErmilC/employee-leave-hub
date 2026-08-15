package com.leavehub.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Table(name = "DEMO_EMAIL")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class DemoEmail {
    @Id
    @Column(name = "id", length = 64)
    private String id;

    @Column(name = "sender_email", nullable = false)
    private String senderEmail;

    @Column(name = "recipient_email", nullable = false)
    private String recipientEmail;

    @Column(name = "recipient_name")
    private String recipientName;

    @Column(name = "subject", nullable = false)
    private String subject;

    @Column(name = "content", length = 2000)
    private String content;

    @Column(name = "sent_at", nullable = false)
    private LocalDateTime sentAt;

    @Column(name = "type")
    private String type; // "SUBMITTED", "APPROVED", "REJECTED", "CANCELLED"
}
