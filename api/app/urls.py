from rest_framework.routers import DefaultRouter

from .views import (
    ActionViewSet,
    CustomerViewSet,
    EmployeeViewSet,
    ItemViewSet,
    OrderViewSet,
    ProductViewSet,
)

router = DefaultRouter()
router.register(r"items", ItemViewSet, basename="item")
router.register(r"employees", EmployeeViewSet, basename="employee")
router.register(r"customers", CustomerViewSet, basename="customer")
router.register(r"products", ProductViewSet, basename="product")
router.register(r"orders", OrderViewSet, basename="order")
router.register(r"actions", ActionViewSet, basename="action")

urlpatterns = router.urls
