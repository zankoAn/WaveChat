from apps.account.models import Profile, User


class ProfileManager:
    @staticmethod
    async def aget_user_profile(username):
        profile = (
            await Profile.objects.select_related("user", "active_chat")
            .filter(user__username=username)
            .afirst()
        )
        return profile

    @staticmethod
    async def update_user_profile(
        profile, status=None, last_seen=None, active_chat=None
    ):
        if last_seen:
            profile.last_seen = last_seen

        if status:
            profile.status = status

        if active_chat:
            profile.active_chat = active_chat

        await profile.asave()
        await profile.arefresh_from_db()

    @staticmethod
    def create_profile(user):
        profile = Profile.objects.create(user=user, status=Profile.Status.ONLINE)
        return profile


class UserManager(ProfileManager):
    @staticmethod
    def get_user(username):
        username = username.lower()
        user = User.objects.filter(username__iexact=username)
        return user.first()

    async def get_user_profile(self, username):
        profile = await self.aget_user_profile(username)
        return profile

    def register_new_user(self, username, password):
        username = username.lower()
        user = (
            User.objects.select_related("profile")
            .filter(username__iexact=username)
            .first()
        )
        if not user:
            new_user = User.objects.create_user(
                username=username,
                password=password,
            )
            self.create_profile(new_user)
            return new_user
        else:
            return None
