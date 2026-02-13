CREATE TABLE Orders (
    orderID VARCHAR(50) PRIMARY KEY NOT NULL, -- Xóa AUTO_INCREMENT ở đây
    status ENUM('pending', 'success', 'fail') NOT NULL DEFAULT 'pending',
    amount DECIMAL(15, 2) NOT NULL
);