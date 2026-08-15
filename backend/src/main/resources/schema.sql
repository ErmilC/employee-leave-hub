-- =============================================================================
-- Employee Leave Hub - Schema Relational Database DDL (H2 / PostgreSQL / MySQL)
-- Conform cerintelor si diagramei UML din tema
-- =============================================================================

-- 1. Tabelul DEPARTMENT
CREATE TABLE IF NOT EXISTS DEPARTMENT (
    dept_id INT AUTO_INCREMENT PRIMARY KEY,
    department_name VARCHAR(255) NOT NULL,
    department_name_en VARCHAR(255) NULL,
    manager_id INT NULL,
    max_absent_employees INT NOT NULL DEFAULT 2
);

-- 2. Tabelul EMPLOYEE
CREATE TABLE IF NOT EXISTS EMPLOYEE (
    empl_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL DEFAULT 'password',
    role VARCHAR(50) NOT NULL, -- 'USER', 'DEPT_RESP', 'ADMIN'
    dept_id INT NULL,
    annual_leave_days INT NOT NULL DEFAULT 24,
    available_leave_days INT NOT NULL DEFAULT 24,
    CONSTRAINT fk_employee_dept FOREIGN KEY (dept_id) REFERENCES DEPARTMENT(dept_id) ON DELETE SET NULL
);

-- 3. Tabelul LEAVE_TYPE
CREATE TABLE IF NOT EXISTS LEAVE_TYPE (
    leave_type_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    name_en VARCHAR(255) NULL,
    code VARCHAR(50) NOT NULL UNIQUE, -- 'CO', 'CM', 'FP', 'SPECIAL'
    requires_attachment BOOLEAN NOT NULL DEFAULT FALSE,
    paid BOOLEAN NOT NULL DEFAULT TRUE
);

-- 4. Tabelul LEAVE_REQUEST
CREATE TABLE IF NOT EXISTS LEAVE_REQUEST (
    leave_request_id INT AUTO_INCREMENT PRIMARY KEY,
    empl_id INT NOT NULL,
    leave_type_id INT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    working_days INT NOT NULL,
    status VARCHAR(50) NOT NULL, -- 'PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_leaverequest_employee FOREIGN KEY (empl_id) REFERENCES EMPLOYEE(empl_id) ON DELETE CASCADE,
    CONSTRAINT fk_leaverequest_type FOREIGN KEY (leave_type_id) REFERENCES LEAVE_TYPE(leave_type_id) ON DELETE RESTRICT
);

-- 5. Tabelul LEAVE_WORKFLOW
CREATE TABLE IF NOT EXISTS LEAVE_WORKFLOW (
    workflow_id INT AUTO_INCREMENT PRIMARY KEY,
    leave_request_id INT NOT NULL,
    empl_id INT NOT NULL,
    old_status VARCHAR(50) NULL,
    current_status VARCHAR(50) NOT NULL,
    changed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    comment VARCHAR(1000) NULL,
    CONSTRAINT fk_workflow_request FOREIGN KEY (leave_request_id) REFERENCES LEAVE_REQUEST(leave_request_id) ON DELETE CASCADE,
    CONSTRAINT fk_workflow_employee FOREIGN KEY (empl_id) REFERENCES EMPLOYEE(empl_id) ON DELETE CASCADE
);

-- 6. Tabelul ATTACHMENT
CREATE TABLE IF NOT EXISTS ATTACHMENT (
    attachment_id INT AUTO_INCREMENT PRIMARY KEY,
    leave_request_id INT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    uploaded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_attachment_request FOREIGN KEY (leave_request_id) REFERENCES LEAVE_REQUEST(leave_request_id) ON DELETE CASCADE
);

-- 7. Tabelul DEMO_EMAIL (Notificari demo in sistem)
CREATE TABLE IF NOT EXISTS DEMO_EMAIL (
    id VARCHAR(100) PRIMARY KEY,
    sender_email VARCHAR(255) NOT NULL,
    recipient_email VARCHAR(255) NOT NULL,
    recipient_name VARCHAR(255) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    content VARCHAR(2000) NOT NULL,
    sent_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    type VARCHAR(50) NOT NULL
);

-- Indexuri pentru performanta cautarii si filtrelor
CREATE INDEX IF NOT EXISTS idx_emp_dept ON EMPLOYEE(dept_id);
CREATE INDEX IF NOT EXISTS idx_req_emp ON LEAVE_REQUEST(empl_id);
CREATE INDEX IF NOT EXISTS idx_req_type ON LEAVE_REQUEST(leave_type_id);
CREATE INDEX IF NOT EXISTS idx_req_dates ON LEAVE_REQUEST(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_workflow_req ON LEAVE_WORKFLOW(leave_request_id);
CREATE INDEX IF NOT EXISTS idx_attach_req ON ATTACHMENT(leave_request_id);
