from typing import Tuple


class InputFileValidator:
    MAX_UPLOAD_SIZE = 100 * 1024 * 1024  # 100MB

    def validate(self, uploaded_file) -> Tuple[bool, str]:
        if not uploaded_file:
            return False, "File not found"

        if uploaded_file.size > self.MAX_UPLOAD_SIZE:
            return False, "File is too large."

        return True, "ok"
