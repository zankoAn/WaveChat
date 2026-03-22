import logging
import inspect

COLORS = {
    "DEBUG": "\033[1;96m",  # Cyan
    "INFO": "\033[1;94m",  # Blue
    "WARNING": "\033[38;5;208m",  # Orange
    "ERROR": "\033[1;91m",  # Red
    "CRITICAL": "\033[1;41m",  # Red background
    "RESET": "\033[0m",  # Reset The Color
}


class ColoredFormatter(logging.Formatter):
    def __init__(self, fmt):
        super().__init__(fmt)

    def format(self, record):
        log_color = COLORS.get(record.levelname, COLORS["RESET"])
        log_message = super().format(record)
        return f"{log_color}{log_message}{COLORS['RESET']}"


class BaseLogger:
    def __init__(self, name):
        self.name = name
        self.logger = self.setup_logger()

    def setup_logger(self):
        logger = logging.getLogger(self.name)
        logger.handlers.clear()
        logger.propagate = False

        handler = logging.StreamHandler()
        formatter = ColoredFormatter(
            "[%(asctime)s: %(levelname)s/%(name)s] %(message)s (%(caller_filename)s:%(caller_lineno)d)"
        )
        handler.setFormatter(formatter)

        logger.addHandler(handler)
        return logger

    def _get_caller_info(self):
        frame = inspect.currentframe().f_back.f_back
        filename = frame.f_code.co_filename
        lineno = frame.f_lineno
        return filename, lineno

    def debug(self, message):
        self.logger.debug(message, extra={"caller_filename": "", "caller_lineno": 0})

    def info(self, message):
        self.logger.info(message, extra={"caller_filename": "", "caller_lineno": 0})

    def warning(self, message):
        self.logger.warning(message, extra={"caller_filename": "", "caller_lineno": 0})

    def error(self, message):
        filename, lineno = self._get_caller_info()
        self.logger.error(message, extra={"caller_filename": filename, "caller_lineno": lineno})

    def critical(self, message):
        filename, lineno = self._get_caller_info()
        self.logger.critical(message, extra={"caller_filename": filename, "caller_lineno": lineno})