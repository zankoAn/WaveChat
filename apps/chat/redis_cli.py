from fakeredis import FakeRedis


redis_client = FakeRedis(decode_responses=True)
